package com.website.journey.backend.domain.article;

import com.website.journey.backend.domain.subscription.SubscriptionService;
import com.website.journey.backend.domain.user.UserRepository;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;

@Service
public class ArticleService {

    private final ArticleRepository articleRepository;
    private final SubscriptionService subscriptionService;
    private final UserRepository userRepository;

    public ArticleService(ArticleRepository articleRepository,
                          SubscriptionService subscriptionService,
                          UserRepository userRepository) {
        this.articleRepository = articleRepository;
        this.subscriptionService = subscriptionService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<ArticleListDto> findAll(String tag, Pageable pageable) {
        if (tag != null && !tag.isBlank()) {
            return articleRepository.findByTagIgnoreCase(tag, pageable).map(this::toListDto);
        }
        return articleRepository.findAll(pageable).map(this::toListDto);
    }

    @Transactional(readOnly = true)
    public java.util.List<String> getDistinctTags() {
        return articleRepository.findDistinctTags();
    }

    @Transactional(readOnly = true)
    public ArticleDetailDto findBySlug(String slug) {
        Article article = articleRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Article not found"));

        List<RelatedArticleDto> relatedArticles = article.getTag() != null
                ? articleRepository
                        .findTop4ByTagAndSlugNotOrderByPublishDateDesc(article.getTag(), slug)
                        .stream()
                        .map(this::toRelatedDto)
                        .toList()
                : Collections.emptyList();

        boolean accessDenied = false;
        String body = article.getBody();

        if (article.isPremium()) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            boolean hasActiveSubscription = false;

            if (authentication != null && authentication.isAuthenticated()
                    && !"anonymousUser".equals(authentication.getName())) {
                String email = authentication.getName();
                Long userId = userRepository.findByEmail(email)
                        .map(user -> user.getId())
                        .orElse(null);
                if (userId != null) {
                    hasActiveSubscription = subscriptionService.getStatus(userId).active();
                }
            }

            if (!hasActiveSubscription) {
                String stripped = article.getBody() != null ? article.getBody().replaceAll("<[^>]*>", "").trim() : "";
                body = stripped.length() > 350 ? stripped.substring(0, 350) + "..." : stripped;
                accessDenied = true;
            }
        }

        return toDetailDto(article, body, relatedArticles, accessDenied);
    }

    @Transactional
    public ArticleDetailDto create(CreateArticleRequest request) {
        Article article = Article.builder()
                .title(request.getTitle())
                .body(sanitize(request.getBody()))
                .slug(request.getSlug())
                .author(request.getAuthor())
                .publishDate(request.getPublishDate())
                .thumbnailUrl(request.getThumbnailUrl())
                .type(request.getType())
                .tag(request.getTag())
                .premium(request.getPremium() != null && request.getPremium())
                .build();

        return toDetailDto(articleRepository.save(article), article.getBody(), Collections.emptyList(), false);
    }

    @Transactional
    public ArticleDetailDto update(String slug, CreateArticleRequest request) {
        Article article = articleRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Article not found"));

        article.setTitle(request.getTitle());
        article.setBody(sanitize(request.getBody()));
        article.setSlug(request.getSlug());
        article.setAuthor(request.getAuthor());
        article.setPublishDate(request.getPublishDate());
        article.setThumbnailUrl(request.getThumbnailUrl());
        article.setType(request.getType());
        article.setTag(request.getTag());
        article.setPremium(request.getPremium() != null && request.getPremium());

        Article saved = articleRepository.save(article);
        return toDetailDto(saved, saved.getBody(), Collections.emptyList(), false);
    }

    @Transactional
    public void delete(String slug) {
        Article article = articleRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Article not found"));

        articleRepository.delete(article);
    }

    private String sanitize(String html) {
        if (html == null) return null;
        return Jsoup.clean(html, Safelist.relaxed()
                .addTags("iframe", "figure", "figcaption")
                .addAttributes("iframe", "src", "width", "height", "allowfullscreen", "frameborder")
                .addAttributes(":all", "class", "id", "style")
                .addProtocols("iframe", "src", "https"));
    }

    private ArticleListDto toListDto(Article article) {
        return new ArticleListDto(
                article.getId(),
                article.getTitle(),
                article.getSlug(),
                article.getAuthor(),
                article.getPublishDate() != null ? article.getPublishDate().toString() : null,
                article.getThumbnailUrl(),
                article.getType(),
                article.getTag(),
                article.isPremium()
        );
    }

    private RelatedArticleDto toRelatedDto(Article article) {
        return new RelatedArticleDto(
                article.getId(),
                article.getTitle(),
                article.getSlug(),
                article.getThumbnailUrl(),
                article.getAuthor(),
                article.getPublishDate() != null ? article.getPublishDate().toString() : null
        );
    }

    private ArticleDetailDto toDetailDto(Article article, String body, List<RelatedArticleDto> relatedArticles, boolean accessDenied) {
        ArticleSeoDto seo = buildSeo(article);
        return new ArticleDetailDto(
                article.getId(),
                article.getTitle(),
                body,
                article.getSlug(),
                article.getAuthor(),
                article.getPublishDate() != null ? article.getPublishDate().toString() : null,
                article.getThumbnailUrl(),
                article.getType(),
                article.getTag(),
                article.getCreatedAt() != null ? article.getCreatedAt().toString() : null,
                article.getUpdatedAt() != null ? article.getUpdatedAt().toString() : null,
                seo,
                relatedArticles,
                article.isPremium(),
                accessDenied
        );
    }

    private ArticleSeoDto buildSeo(Article article) {
        String metaDescription = null;
        if (article.getBody() != null) {
            String stripped = article.getBody().replaceAll("<[^>]*>", "").trim();
            metaDescription = stripped.substring(0, Math.min(160, stripped.length()));
        }

        return new ArticleSeoDto(
                article.getTitle() != null ? article.getTitle() + " | Journey" : null,
                metaDescription,
                "/content/" + article.getSlug(),
                article.getThumbnailUrl(),
                article.getPublishDate() != null ? article.getPublishDate().toString() : null,
                article.getAuthor()
        );
    }
}
