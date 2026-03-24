package com.website.journey.backend.domain.article;

import com.website.journey.backend.websocket.WebSocketEventService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
public class ArticleSchedulerService {

    private final ArticleRepository articleRepository;
    private final WebSocketEventService webSocketEventService;

    public ArticleSchedulerService(ArticleRepository articleRepository,
                                   WebSocketEventService webSocketEventService) {
        this.articleRepository = articleRepository;
        this.webSocketEventService = webSocketEventService;
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void publishScheduledArticles() {
        List<Article> toPublish = articleRepository.findScheduledToPublish(LocalDateTime.now());
        for (Article article : toPublish) {
            article.setStatus(ArticleStatus.PUBLISHED);
            articleRepository.save(article);
            log.info("Auto-published scheduled article: {}", article.getSlug());
            if (article.isBreakingNews()) {
                String strippedBody = article.getBody() != null
                        ? article.getBody().replaceAll("<[^>]*>", "").trim() : "";
                String summary = strippedBody.substring(0, Math.min(150, strippedBody.length()));
                webSocketEventService.emitBreakingNewsPublished(
                        article.getId(), article.getTitle(), article.getSlug(), summary);
            }
        }
        if (!toPublish.isEmpty()) {
            log.info("Auto-published {} scheduled article(s)", toPublish.size());
        }
    }
}
