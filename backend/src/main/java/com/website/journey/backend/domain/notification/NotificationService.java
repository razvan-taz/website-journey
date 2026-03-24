package com.website.journey.backend.domain.notification;

import com.website.journey.backend.domain.user.UserRepository;
import com.website.journey.backend.websocket.WebSocketEventService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final WebSocketEventService webSocketEventService;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository,
                                WebSocketEventService webSocketEventService,
                                UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.webSocketEventService = webSocketEventService;
        this.userRepository = userRepository;
    }

    private static final int MAX_MESSAGE_LENGTH = 500;

    @Transactional
    public void createForUser(Long userId, String message, String type, Long orderId) {
        String safeMessage = message != null && message.length() > MAX_MESSAGE_LENGTH
                ? message.substring(0, MAX_MESSAGE_LENGTH)
                : message;
        userRepository.findById(userId)
                .filter(user -> user.isNotificationsEnabled())
                .ifPresent(user -> {
                    Notification notification = Notification.builder()
                            .userId(userId)
                            .message(safeMessage)
                            .type(type)
                            .orderId(orderId)
                            .reviewed(false)
                            .build();

                    Notification saved = notificationRepository.save(notification);
                    webSocketEventService.emitUserNotification(userId, saved.getId(), safeMessage, type, orderId);
                });
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void markAllReviewed(Long userId) {
        List<Notification> unreviewed = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(n -> !n.isReviewed())
                .toList();
        unreviewed.forEach(n -> n.setReviewed(true));
        notificationRepository.saveAll(unreviewed);
    }

    @Transactional
    public void deleteReviewed(Long userId) {
        notificationRepository.deleteByUserIdAndReviewedTrue(userId);
    }

    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndReviewedFalse(userId);
    }

    private NotificationDto toDto(Notification n) {
        return new NotificationDto(n.getId(), n.getMessage(), n.getType(), n.getOrderId(), n.isReviewed(), n.getCreatedAt());
    }
}
