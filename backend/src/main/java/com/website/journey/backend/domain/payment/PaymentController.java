package com.website.journey.backend.domain.payment;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.website.journey.backend.domain.order.OrderRepository;
import com.website.journey.backend.domain.order.OrderService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Value("${stripe.publishable-key}")
    private String publishableKey;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    private final OrderRepository orderRepository;
    private final OrderService orderService;

    public PaymentController(OrderRepository orderRepository, OrderService orderService) {
        this.orderRepository = orderRepository;
        this.orderService = orderService;
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> getConfig() {
        return ResponseEntity.ok(Map.of("publishableKey", publishableKey));
    }

    @PostMapping("/create-intent")
    public ResponseEntity<Map<String, String>> createIntent(
            @RequestBody CreatePaymentIntentRequest request) {
        try {
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount((long) request.amount())
                    .setCurrency(request.currency() != null ? request.currency() : "eur")
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .build()
                    )
                    .putMetadata("orderId", request.orderId() != null ? request.orderId() : "")
                    .build();

            PaymentIntent intent = PaymentIntent.create(params);

            return ResponseEntity.ok(Map.of(
                    "clientSecret", intent.getClientSecret(),
                    "paymentIntentId", intent.getId()
            ));
        } catch (StripeException e) {
            log.warn("Stripe error creating payment intent: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Transactional
    @PostMapping(value = "/webhook", consumes = "application/json")
    public ResponseEntity<String> webhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);

            if ("payment_intent.succeeded".equals(event.getType())) {
                Optional<StripeObject> stripeObject = event.getDataObjectDeserializer().getObject();
                stripeObject.ifPresent(obj -> {
                    PaymentIntent paymentIntent = (PaymentIntent) obj;
                    orderRepository.findByPaymentIntentId(paymentIntent.getId()).ifPresentOrElse(
                            order -> {
                                // Use orderService to update status so WebSocket event is emitted
                                orderService.updateOrderStatus(order.getId(), "PAID");
                                log.info("[Stripe] Order {} marked as PAID (paymentIntent={})",
                                        order.getId(), paymentIntent.getId());
                            },
                            () -> log.warn("[Stripe] No order found for paymentIntentId={}",
                                    paymentIntent.getId())
                    );
                });
            } else if ("payment_intent.payment_failed".equals(event.getType())) {
                Optional<StripeObject> stripeObject = event.getDataObjectDeserializer().getObject();
                stripeObject.ifPresent(obj -> {
                    PaymentIntent paymentIntent = (PaymentIntent) obj;
                    orderRepository.findByPaymentIntentId(paymentIntent.getId()).ifPresent(order -> {
                        orderService.updateOrderStatus(order.getId(), "PAYMENT_FAILED");
                        log.warn("[Stripe] Order {} payment failed (paymentIntent={})",
                                order.getId(), paymentIntent.getId());
                    });
                });
            } else {
                log.debug("[Stripe] Unhandled event type: {}", event.getType());
            }

            return ResponseEntity.ok("received");
        } catch (SignatureVerificationException e) {
            log.warn("[Stripe] Webhook signature verification failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Invalid signature");
        }
    }
}
