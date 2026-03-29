package com.website.journey.backend.config;

import com.website.journey.backend.domain.user.User;
import com.website.journey.backend.domain.user.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.default.email:admin@journey.dev}")
    private String adminDefaultEmail;

    @Value("${admin.default.password:Admin1234!}")
    private String adminDefaultPassword;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.findByEmail(adminDefaultEmail).isEmpty()) {
            User admin = User.builder()
                    .name("Admin")
                    .email(adminDefaultEmail)
                    .password(passwordEncoder.encode(adminDefaultPassword))
                    .role("ADMIN")
                    .build();
            userRepository.save(admin);
            log.info("[DataInitializer] Default admin user created.");
        }
    }
}
