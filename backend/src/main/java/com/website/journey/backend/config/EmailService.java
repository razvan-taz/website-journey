package com.website.journey.backend.config;

import com.website.journey.backend.domain.emailconfig.EmailConfig;
import com.website.journey.backend.domain.emailconfig.EmailConfigService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final EmailConfigService emailConfigService;

    @Value("${app.base-url}")
    private String baseUrl;

    public EmailService(JavaMailSender mailSender,
                        TemplateEngine templateEngine,
                        EmailConfigService emailConfigService) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.emailConfigService = emailConfigService;
    }

    public record OrderItemDetail(String name, int quantity, BigDecimal price) {}

    private String fromAddress() {
        try {
            EmailConfig config = emailConfigService.getConfig();
            String address = config.getFromAddress();
            String name = config.getFromName();
            return name != null && !name.isBlank()
                    ? name + " <" + address + ">"
                    : address;
        } catch (Exception e) {
            log.warn("Could not load email from-address from config, using fallback: {}", e.getMessage());
            return "noreply@journey.com";
        }
    }

    @Async
    public void sendOrderConfirmation(String toEmail,
                                      String userName,
                                      String orderId,
                                      List<OrderItemDetail> items,
                                      BigDecimal total,
                                      String shippingName) {
        try {
            Context ctx = new Context();
            ctx.setVariable("userName", userName);
            ctx.setVariable("orderId", orderId);
            ctx.setVariable("items", items);
            ctx.setVariable("total", total);
            ctx.setVariable("shippingName", shippingName);
            ctx.setVariable("baseUrl", baseUrl);

            String html = templateEngine.process("email/order-confirmation", ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress());
            helper.setTo(toEmail);
            helper.setSubject("Order Confirmation #" + orderId);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Order confirmation email sent to {} for order {}", toEmail, orderId);
        } catch (MessagingException e) {
            log.warn("Failed to send order confirmation email to {} for order {}: {}", toEmail, orderId, e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error sending order confirmation email to {} for order {}: {}", toEmail, orderId, e.getMessage());
        }
    }

    @Async
    public void sendPasswordReset(String toEmail, String token) {
        try {
            String resetLink = baseUrl + "/reset-password?token=" + token;
            String subject = "Reset your Journey password";
            String html = "<html><body style='font-family:sans-serif;background:#111;color:#dadada;padding:32px'>"
                    + "<h2 style='color:#880824'>Reset your password</h2>"
                    + "<p>Click the link below to reset your password. This link expires in 1 hour.</p>"
                    + "<a href='" + resetLink + "' style='display:inline-block;padding:12px 24px;background:#880824;color:#fff;text-decoration:none;border-radius:4px;margin:16px 0'>Reset Password</a>"
                    + "<p style='color:#666;font-size:13px'>If you didn't request this, you can safely ignore this email.</p>"
                    + "</body></html>";

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress());
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Password reset email sent to {}", toEmail);
        } catch (MessagingException e) {
            log.warn("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error sending password reset email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendNewsletterConfirmation(String toEmail) {
        try {
            String subject = "You're subscribed to Journey";
            String html = "<html><body style='font-family:sans-serif;background:#111;color:#dadada;padding:32px'>"
                    + "<h2 style='color:#880824'>Welcome to Journey</h2>"
                    + "<p>You've successfully subscribed to our newsletter. We'll keep you updated with the latest content and offers.</p>"
                    + "<a href='" + baseUrl + "' style='display:inline-block;padding:12px 24px;background:#880824;color:#fff;text-decoration:none;border-radius:4px;margin:16px 0'>Visit Journey</a>"
                    + "</body></html>";

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress());
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Newsletter confirmation email sent to {}", toEmail);
        } catch (MessagingException e) {
            log.warn("Failed to send newsletter confirmation email to {}: {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error sending newsletter confirmation email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendRefundApprovedEmail(String toEmail, String userName, String orderId, java.math.BigDecimal amount) {
        try {
            Context ctx = new Context();
            ctx.setVariable("userName", userName);
            ctx.setVariable("orderId", orderId);
            ctx.setVariable("amount", amount);
            ctx.setVariable("baseUrl", baseUrl);

            String html = templateEngine.process("email/refund-approved", ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress());
            helper.setTo(toEmail);
            helper.setSubject("Your refund has been processed");
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Refund approved email sent to {} for order {}", toEmail, orderId);
        } catch (MessagingException e) {
            log.warn("Failed to send refund approved email to {} for order {}: {}", toEmail, orderId, e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error sending refund approved email to {} for order {}: {}", toEmail, orderId, e.getMessage());
        }
    }

    @Async
    public void sendRefundRejectedEmail(String toEmail, String userName, String orderId, String rejectionReason) {
        try {
            Context ctx = new Context();
            ctx.setVariable("userName", userName);
            ctx.setVariable("orderId", orderId);
            ctx.setVariable("rejectionReason", rejectionReason);
            ctx.setVariable("baseUrl", baseUrl);

            String html = templateEngine.process("email/refund-rejected", ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress());
            helper.setTo(toEmail);
            helper.setSubject("Refund request update");
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Refund rejected email sent to {} for order {}", toEmail, orderId);
        } catch (MessagingException e) {
            log.warn("Failed to send refund rejected email to {} for order {}: {}", toEmail, orderId, e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error sending refund rejected email to {} for order {}: {}", toEmail, orderId, e.getMessage());
        }
    }

    @Async
    public void sendEmailVerification(String toEmail, String userName, String token) {
        try {
            Context ctx = new Context();
            ctx.setVariable("userName", userName);
            ctx.setVariable("verificationLink", baseUrl + "/verify-email?token=" + token);
            ctx.setVariable("baseUrl", baseUrl);

            String html = templateEngine.process("email/email-verification", ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress());
            helper.setTo(toEmail);
            helper.setSubject("Verify your email");
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Email verification sent to {}", toEmail);
        } catch (MessagingException e) {
            log.warn("Failed to send email verification to {}: {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error sending email verification to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendNewsletterToSubscriber(String toEmail, String subject, String body, String unsubscribeUrl) {
        try {
            String fullBody = body + "<br><br><hr style='border:none;border-top:1px solid #333;margin:24px 0'>"
                    + "<p style='color:#666;font-size:12px;text-align:center;margin:0'>"
                    + "You are receiving this because you subscribed to our newsletter. "
                    + "<a href='" + unsubscribeUrl + "' style='color:#880824'>Unsubscribe</a></p>";
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress());
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(fullBody, true);
            mailSender.send(message);
            log.info("Newsletter sent to {}", toEmail);
        } catch (MessagingException e) {
            log.warn("Failed to send newsletter to {}: {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error sending newsletter to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendTestEmail() {
        try {
            String toEmail = fromAddress();
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress());
            helper.setTo(toEmail);
            helper.setSubject("Journey — SMTP test");
            helper.setText("<html><body style='font-family:sans-serif;background:#111;color:#dadada;padding:32px'>"
                    + "<h2 style='color:#880824'>SMTP test successful</h2>"
                    + "<p>Your email configuration is working correctly.</p>"
                    + "</body></html>", true);
            mailSender.send(message);
            log.info("Test email sent to {}", toEmail);
        } catch (MessagingException e) {
            throw new RuntimeException("SMTP test failed: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("SMTP test failed: " + e.getMessage(), e);
        }
    }

    @Async
    public void sendWelcomeEmail(String toEmail, String userName) {
        try {
            Context ctx = new Context();
            ctx.setVariable("userName", userName);
            ctx.setVariable("baseUrl", baseUrl);

            String html = templateEngine.process("email/welcome", ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress());
            helper.setTo(toEmail);
            helper.setSubject("Welcome to Journey!");
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Welcome email sent to {}", toEmail);
        } catch (MessagingException e) {
            log.warn("Failed to send welcome email to {}: {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error sending welcome email to {}: {}", toEmail, e.getMessage());
        }
    }
}
