package com.website.journey.backend.domain.analytics;

import com.website.journey.backend.domain.newsletter.NewsletterRepository;
import com.website.journey.backend.domain.order.OrderRepository;
import com.website.journey.backend.domain.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AnalyticsService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final NewsletterRepository newsletterRepository;

    public AnalyticsService(OrderRepository orderRepository,
                             UserRepository userRepository,
                             NewsletterRepository newsletterRepository) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.newsletterRepository = newsletterRepository;
    }

    @Transactional(readOnly = true)
    public AnalyticsDto getAnalytics() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime startOfYear  = now.withDayOfYear(1).withHour(0).withMinute(0).withSecond(0).withNano(0);

        BigDecimal revenueThisMonth = orderRepository.sumPaidTotalSince(startOfMonth);
        BigDecimal revenueThisYear  = orderRepository.sumPaidTotalSince(startOfYear);
        BigDecimal revenueTotal     = orderRepository.sumPaidTotalAll();

        long completedOrders = orderRepository.countByStatus("PAID");

        long newsletterSubscribers = newsletterRepository.count();

        long usersThisMonth = userRepository.countByCreatedAtAfter(startOfMonth);
        long usersThisYear  = userRepository.countByCreatedAtAfter(startOfYear);
        long usersTotal     = userRepository.count();

        return new AnalyticsDto(
                new AnalyticsDto.RevenueStats(revenueThisMonth, revenueThisYear, revenueTotal),
                completedOrders,
                newsletterSubscribers,
                new AnalyticsDto.UserStats(usersThisMonth, usersThisYear, usersTotal)
        );
    }

    @Transactional(readOnly = true)
    public ChartsDto getCharts() {
        LocalDateTime start = LocalDateTime.now().minusDays(29)
                .withHour(0).withMinute(0).withSecond(0).withNano(0);

        List<ChartsDto.DailyPoint> daily = orderRepository.dailyRevenueAndOrdersSince(start)
                .stream()
                .map(row -> new ChartsDto.DailyPoint(
                        row[0].toString(),
                        new BigDecimal(row[1].toString()),
                        ((Number) row[2]).longValue()
                ))
                .toList();

        List<ChartsDto.TopProduct> top = orderRepository.topProductsByRevenue()
                .stream()
                .map(row -> new ChartsDto.TopProduct(
                        (String) row[0],
                        new BigDecimal(row[1].toString())
                ))
                .toList();

        return new ChartsDto(daily, top);
    }
}
