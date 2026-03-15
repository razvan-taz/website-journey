package com.website.journey.backend.domain.search;

import com.website.journey.backend.domain.article.ArticleRepository;
import com.website.journey.backend.domain.product.ProductRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class SearchService {

    private final ArticleRepository articleRepository;
    private final ProductRepository productRepository;

    public SearchService(ArticleRepository articleRepository, ProductRepository productRepository) {
        this.articleRepository = articleRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<SearchResultDto> search(String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }

        String trimmed = query.trim();
        Pageable limit = PageRequest.of(0, 5);

        List<SearchResultDto> results = new ArrayList<>();

        articleRepository.searchByQuery(trimmed, limit).forEach(article -> {
            String summary = extractSummary(article.getBody(), 120);
            results.add(new SearchResultDto(
                    article.getSlug(),
                    article.getTitle(),
                    summary,
                    "content",
                    "/content/" + article.getSlug()
            ));
        });

        productRepository.searchByQuery(trimmed, limit).forEach(product -> {
            String summary = product.getDescription() != null
                    ? product.getDescription().substring(0, Math.min(120, product.getDescription().length()))
                    : product.getName();
            results.add(new SearchResultDto(
                    String.valueOf(product.getId()),
                    product.getName(),
                    summary,
                    "store",
                    "/store/" + product.getId()
            ));
        });

        return results;
    }

    private String extractSummary(String html, int maxLength) {
        if (html == null) return "";
        String plain = html.replaceAll("<[^>]*>", "").trim();
        return plain.length() > maxLength ? plain.substring(0, maxLength) + "..." : plain;
    }
}
