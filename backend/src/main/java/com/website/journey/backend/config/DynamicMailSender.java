package com.website.journey.backend.config;

import com.website.journey.backend.domain.emailconfig.EmailConfig;
import com.website.journey.backend.domain.emailconfig.EmailConfigService;
import jakarta.mail.internet.MimeMessage;
import org.springframework.context.annotation.Primary;
import org.springframework.lang.NonNull;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.Properties;

/**
 * A JavaMailSender that loads SMTP configuration from the database on every send call.
 * This ensures that config changes made via the admin panel take effect immediately
 * without restarting the server.
 *
 * Marked @Primary so that Spring injects this wherever JavaMailSender is requested,
 * replacing the auto-configured Spring Boot mail sender.
 */
@Primary
@Component
public class DynamicMailSender implements JavaMailSender {

    private final EmailConfigService emailConfigService;

    public DynamicMailSender(EmailConfigService emailConfigService) {
        this.emailConfigService = emailConfigService;
    }

    private JavaMailSenderImpl buildSender() {
        EmailConfig config = emailConfigService.getConfig();

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(config.getSmtpHost());
        sender.setPort(config.getSmtpPort());
        sender.setUsername(config.getUsername());
        sender.setPassword(emailConfigService.getDecryptedSmtpPassword());

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");

        if (config.isSslEnabled()) {
            props.put("mail.smtp.ssl.enable", "true");
        } else {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
        }

        return sender;
    }

    @Override
    public @NonNull MimeMessage createMimeMessage() {
        return buildSender().createMimeMessage();
    }

    @Override
    public @NonNull MimeMessage createMimeMessage(@NonNull InputStream contentStream) throws MailException {
        return buildSender().createMimeMessage(contentStream);
    }

    @Override
    public void send(@NonNull MimeMessage mimeMessage) throws MailException {
        buildSender().send(mimeMessage);
    }

    @Override
    public void send(@NonNull MimeMessage... mimeMessages) throws MailException {
        buildSender().send(mimeMessages);
    }

    @Override
    public void send(@NonNull SimpleMailMessage simpleMessage) throws MailException {
        buildSender().send(simpleMessage);
    }

    @Override
    public void send(@NonNull SimpleMailMessage... simpleMessages) throws MailException {
        buildSender().send(simpleMessages);
    }
}
