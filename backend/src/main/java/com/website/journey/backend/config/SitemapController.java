package com.website.journey.backend.config;

import com.website.journey.backend.domain.article.ArticleRepository;
import com.website.journey.backend.domain.product.ProductRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SitemapController {

    private final ArticleRepository articleRepository;
    private final ProductRepository productRepository;

    @Value("${app.base-url}")
    private String baseUrl;

    public SitemapController(ArticleRepository articleRepository, ProductRepository productRepository) {
        this.articleRepository = articleRepository;
        this.productRepository = productRepository;
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public String sitemap() {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        // Static pages
        for (String path : new String[]{"", "/content", "/store", "/about", "/subscribe"}) {
            sb.append("  <url><loc>").append(baseUrl).append(path).append("</loc></url>\n");
        }

        // Articles (limited to 500)
        articleRepository.findAll(PageRequest.of(0, 500)).forEach(article -> {
            if (article.getSlug() != null) {
                sb.append("  <url>\n");
                sb.append("    <loc>").append(baseUrl).append("/content/").append(article.getSlug()).append("</loc>\n");
                if (article.getUpdatedAt() != null) {
                    sb.append("    <lastmod>").append(article.getUpdatedAt().toLocalDate()).append("</lastmod>\n");
                }
                sb.append("  </url>\n");
            }
        });

        // Products (limited to 500)
        productRepository.findAllByActiveTrue(PageRequest.of(0, 500)).forEach(product -> {
            sb.append("  <url>\n");
            sb.append("    <loc>").append(baseUrl).append("/store/").append(product.getId()).append("</loc>\n");
            if (product.getUpdatedAt() != null) {
                sb.append("    <lastmod>").append(product.getUpdatedAt().toLocalDate()).append("</lastmod>\n");
            }
            sb.append("  </url>\n");
        });

        sb.append("</urlset>");
        return sb.toString();
    }

    @GetMapping(value = "/robots.txt", produces = "text/plain")
    public ResponseEntity<String> robotsTxt() {
        String content = "User-agent: *\n" +
                "Allow: /\n" +
                "Disallow: /api/\n" +
                "Disallow: /admin\n" +
                "Disallow: /checkout\n" +
                "Disallow: /profile\n" +
                "Disallow: /order-confirmation\n\n" +
                "Sitemap: " + baseUrl + "/sitemap.xml\n";
        return ResponseEntity.ok()
                .header("Content-Type", "text/plain; charset=UTF-8")
                .body(content);
    }
}
