package com.website.journey.backend.domain.analytics;

import java.math.BigDecimal;

public record AnalyticsDto(
        RevenueStats revenue,
        long completedOrders,
        long newsletterSubscribers,
        UserStats newUsers
) {
    public record RevenueStats(BigDecimal thisMonth, BigDecimal thisYear, BigDecimal total) {}
    public record UserStats(long thisMonth, long thisYear, long total) {}
}
