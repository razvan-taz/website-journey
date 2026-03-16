package com.website.journey.backend.domain.payment;

public record CreatePaymentIntentRequest(int amount, String currency, String orderId) {}
