package com.website.journey.backend.domain.analytics;

import com.website.journey.backend.domain.newsletter.NewsletterRepository;
import com.website.journey.backend.domain.order.OrderRepository;
import com.website.journey.backend.domain.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
}
