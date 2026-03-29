package com.website.journey.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_MS = 60_000; // 1 minute

    private final ConcurrentHashMap<String, WindowCounter> counters = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        return !isRateLimitedPath(path);
    }

    private boolean isRateLimitedPath(String path) {
        return path.startsWith("/api/auth/")
                || path.equals("/api/payments/create-intent")
                || path.equals("/api/coupons/validate")
                || path.equals("/api/contact")
                || path.equals("/api/newsletter/subscribe");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String ip = getClientIp(request);
        WindowCounter counter = counters.computeIfAbsent(ip, k -> new WindowCounter(WINDOW_MS, MAX_REQUESTS));

        if (!counter.tryAcquire()) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Try again in a minute.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank() && isPrivateOrLoopback(remoteAddr)) {
            return forwarded.split(",")[0].trim();
        }
        return remoteAddr;
    }

    private boolean isPrivateOrLoopback(String ip) {
        if (ip == null) return false;
        if (ip.equals("0:0:0:0:0:0:0:1") || ip.equals("::1")) return true;
        if (ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
        if (ip.startsWith("172.")) {
            String[] parts = ip.split("\\.");
            if (parts.length == 4) {
                try {
                    int second = Integer.parseInt(parts[1]);
                    return second >= 16 && second <= 31;
                } catch (NumberFormatException ignored) {}
            }
        }
        return false;
    }

    private static class WindowCounter {
        private final AtomicLong counter = new AtomicLong(0);
        private volatile long windowStart = System.currentTimeMillis();
        private final long windowMs;
        private final long maxRequests;

        WindowCounter(long windowMs, long maxRequests) {
            this.windowMs = windowMs;
            this.maxRequests = maxRequests;
        }

        public synchronized boolean tryAcquire() {
            long now = System.currentTimeMillis();
            if (now - windowStart >= windowMs) {
                windowStart = now;
                counter.set(1);
                return true;
            }
            return counter.incrementAndGet() <= maxRequests;
        }
    }
}
