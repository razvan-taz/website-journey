package com.website.journey.backend.config;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Pattern USER_TOPIC_PATTERN = Pattern.compile("^/topic/user/(\\d+)/");

    private final JwtUtil jwtUtil;

    public StompAuthChannelInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();

        if (StompCommand.CONNECT.equals(command)) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new MessagingException("Unauthorized: missing or invalid Authorization header");
            }

            String token = authHeader.substring(7);
            if (!jwtUtil.isTokenValid(token)) {
                throw new MessagingException("Unauthorized: invalid or expired token");
            }

            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);
            Long userId = jwtUtil.extractUserId(token);

            List<SimpleGrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_" + role)
            );

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(email, null, authorities);
            authentication.setDetails(userId);

            accessor.setUser(authentication);
        }

        if (StompCommand.SUBSCRIBE.equals(command)) {
            String destination = accessor.getDestination();
            if (destination == null) {
                return message;
            }

            UsernamePasswordAuthenticationToken user =
                    (UsernamePasswordAuthenticationToken) accessor.getUser();

            if (destination.startsWith("/topic/admin/")) {
                if (user == null || user.getAuthorities().stream()
                        .noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                    throw new MessagingException("Forbidden: admin topic requires ADMIN role");
                }
            }

            Matcher userMatcher = USER_TOPIC_PATTERN.matcher(destination);
            if (userMatcher.find()) {
                long topicUserId = Long.parseLong(userMatcher.group(1));
                Long authenticatedUserId = (user != null && user.getDetails() instanceof Long)
                        ? (Long) user.getDetails()
                        : null;

                if (authenticatedUserId == null || !authenticatedUserId.equals(topicUserId)) {
                    throw new MessagingException("Forbidden: cannot subscribe to another user's topic");
                }
            }
        }

        return message;
    }
}
