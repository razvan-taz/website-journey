package com.website.journey.backend.domain.article;

import com.website.journey.backend.websocket.WebSocketEventService;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;

@Service
public class ArticleService {

    private static final int WORDS_PER_MINUTE = 200;

    private final ArticleRepository articleRepository;
    private final WebSocketEventService webSocketEventService;

    public ArticleService(ArticleRepository articleRepository,
                          WebSocketEventService webSocketEventService) {
        this.articleRepository = articleRepository;
        this.webSocketEventService = webSocketEventService;
    }

    // --- Public endpoints (PUBLISHED only) ---

    @Transactional(readOnly = true)
    public Page<ArticleListDto> findAll(String tag, ArticleCategory category, Pageable pageable) {
        if (category != null) {
            return articleRepository.findByCategoryAndStatus(category, ArticleStatus.PUBLISHED, pageable)
                    .map(this::toListDto);
        }
        if (tag != null && !tag.isBlank()) {
            return articleRepository.findByTagIgnoreCaseAndStatus(tag, ArticleStatus.PUBLISHED, pageable)
                    .map(this::toListDto);
        }
        return articleRepository.findByStatus(ArticleStatus.PUBLISHED, pageable).map(this::toListDto);
    }

    @Transactional(readOnly = true)
    public List<String> getDistinctTags() {
        return articleRepository.findDistinctTags();
    }

    @Transactional
    public ArticleDetailDto findBySlug(String slug) {
        Article article = articleRepository.findBySlugAndStatus(slug, ArticleStatus.PUBLISHED)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Article not found"));

        article.setViewCount(article.getViewCount() + 1);
        articleRepository.save(article);

        List<RelatedArticleDto> relatedArticles = article.getTag() != null
                ? articleRepository
                        .findTop4ByTagAndSlugNotAndStatusOrderByPublishDateDesc(article.getTag(), slug, ArticleStatus.PUBLISHED)
                        .stream()
                        .map(this::toRelatedDto)
                        .toList()
                : Collections.emptyList();

        return toDetailDto(article, article.getBody(), relatedArticles, false);
    }

    // --- Admin endpoints (all statuses) ---

    @Transactional(readOnly = true)
    public Page<ArticleListDto> findAllAdmin(String tag, ArticleCategory category, ArticleStatus status, Pageable pageable) {
        if (status != null && category != null) {
            return articleRepository.findByStatusAndCategory(status, category, pageable).map(this::toListDto);
        }
        if (status != null && tag != null && !tag.isBlank()) {
            return articleRepository.findByStatusAndTagIgnoreCase(status, tag, pageable).map(this::toListDto);
        }
        if (status != null) {
            return articleRepository.findByStatus(status, pageable).map(this::toListDto);
        }
        if (category != null) {
            return articleRepository.findByCategory(category, pageable).map(this::toListDto);
        }
        if (tag != null && !tag.isBlank()) {
            return articleRepository.findByTagIgnoreCase(tag, pageable).map(this::toListDto);
        }
        return articleRepository.findAll(pageable).map(this::toListDto);
    }

    @Transactional(readOnly = true)
    public ArticleDetailDto findBySlugAdmin(String slug) {
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

        return toDetailDto(article, article.getBody(), relatedArticles, false);
    }

    @Transactional
    public ArticleDetailDto create(CreateArticleRequest request) {
        ArticleStatus status = request.getStatus() != null ? request.getStatus() : ArticleStatus.PUBLISHED;
        String sanitizedBody = sanitize(request.getBody());

        Article article = Article.builder()
                .title(request.getTitle())
                .body(sanitizedBody)
                .slug(request.getSlug())
                .author(request.getAuthor())
                .publishDate(request.getPublishDate())
                .thumbnailUrl(request.getThumbnailUrl())
                .type(request.getType())
                .tag(request.getTag())
                .videoUrl(request.getVideoUrl())
                .breakingNews(request.isBreakingNews())
                .status(status)
                .scheduledAt(request.getScheduledAt())
                .category(request.getCategory())
                .tags(request.getTags())
                .readingTimeMinutes(calculateReadingTime(sanitizedBody))
                .build();

        Article saved = articleRepository.save(article);

        if (saved.isBreakingNews() && saved.getStatus() == ArticleStatus.PUBLISHED) {
            emitBreakingNews(saved);
        }

        return toDetailDto(saved, saved.getBody(), Collections.emptyList(), false);
    }

    @Transactional
    public ArticleDetailDto update(String slug, CreateArticleRequest request) {
        Article article = articleRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Article not found"));

        String sanitizedBody = sanitize(request.getBody());

        article.setTitle(request.getTitle());
        article.setBody(sanitizedBody);
        article.setSlug(request.getSlug());
        article.setAuthor(request.getAuthor());
        article.setPublishDate(request.getPublishDate());
        article.setThumbnailUrl(request.getThumbnailUrl());
        article.setType(request.getType());
        article.setTag(request.getTag());
        article.setVideoUrl(request.getVideoUrl());
        article.setBreakingNews(request.isBreakingNews());
        if (request.getStatus() != null) {
            article.setStatus(request.getStatus());
        }
        article.setScheduledAt(request.getScheduledAt());
        article.setCategory(request.getCategory());
        article.setTags(request.getTags());
        article.setReadingTimeMinutes(calculateReadingTime(sanitizedBody));

        Article saved = articleRepository.save(article);

        if (saved.isBreakingNews() && saved.getStatus() == ArticleStatus.PUBLISHED) {
            emitBreakingNews(saved);
        }

        return toDetailDto(saved, saved.getBody(), Collections.emptyList(), false);
    }

    @Transactional
    public void delete(String slug) {
        Article article = articleRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Article not found"));

        articleRepository.delete(article);
    }

    private int calculateReadingTime(String html) {
        if (html == null || html.isBlank()) return 1;
        String text = html.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
        int wordCount = text.split("\\s+").length;
        return Math.max(1, (int) Math.ceil((double) wordCount / WORDS_PER_MINUTE));
    }

    private void emitBreakingNews(Article article) {
        String strippedBody = article.getBody() != null
                ? article.getBody().replaceAll("<[^>]*>", "").trim()
                : "";
        String summary = strippedBody.substring(0, Math.min(150, strippedBody.length()));
        webSocketEventService.emitBreakingNewsPublished(
                article.getId(),
                article.getTitle(),
                article.getSlug(),
                summary
        );
    }

    private String sanitize(String html) {
        if (html == null) return null;
        return Jsoup.clean(html, Safelist.relaxed()
                .addTags("iframe", "figure", "figcaption")
                .addAttributes("iframe", "src", "width", "height", "allowfullscreen", "frameborder")
                .addAttributes(":all", "class", "id")
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
                article.getVideoUrl(),
                article.isBreakingNews(),
                article.getStatus(),
                article.getViewCount(),
                article.getScheduledAt() != null ? article.getScheduledAt().toString() : null,
                article.getCategory(),
                article.getTags(),
                article.getReadingTimeMinutes()
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
                article.getVideoUrl(),
                article.isBreakingNews(),
                article.getCreatedAt() != null ? article.getCreatedAt().toString() : null,
                article.getUpdatedAt() != null ? article.getUpdatedAt().toString() : null,
                seo,
                relatedArticles,
                accessDenied,
                article.getStatus(),
                article.getViewCount(),
                article.getScheduledAt() != null ? article.getScheduledAt().toString() : null,
                article.getCategory(),
                article.getTags(),
                article.getReadingTimeMinutes()
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
