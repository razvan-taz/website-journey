package com.website.journey.backend.domain.notification;

import com.website.journey.backend.domain.user.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserService userService;

    public NotificationController(NotificationService notificationService,
                                   UserService userService) {
        this.notificationService = notificationService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationDto>> getNotifications() {
        return ResponseEntity.ok(notificationService.getForUser(resolveUserId()));
    }

    @PostMapping("/mark-reviewed")
    public ResponseEntity<Void> markReviewed() {
        notificationService.markAllReviewed(resolveUserId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/reviewed")
    public ResponseEntity<Void> deleteReviewed() {
        notificationService.deleteReviewed(resolveUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(resolveUserId())));
    }

    @PutMapping("/preferences")
    public ResponseEntity<Void> updatePreferences(@RequestBody Map<String, Boolean> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        userService.toggleNotifications(auth.getName(), enabled);
        return ResponseEntity.ok().build();
    }

    private Long resolveUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        Object details = auth.getDetails();
        if (!(details instanceof Long)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return (Long) details;
    }
}
