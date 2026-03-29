package com.website.journey.backend.domain.analytics;

import java.math.BigDecimal;
import java.util.List;

public record ChartsDto(
        List<DailyPoint> dailyRevenue,
        List<TopProduct> topProducts
) {
    public record DailyPoint(String date, BigDecimal revenue, long orders) {}
    public record TopProduct(String name, BigDecimal revenue) {}
}
