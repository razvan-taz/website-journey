package com.website.journey.backend.config;

import com.website.journey.backend.domain.user.User;
import com.website.journey.backend.domain.user.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.findByEmail("admin@journey.dev").isEmpty()) {
            User admin = User.builder()
                    .name("Admin")
                    .email("admin@journey.dev")
                    .password(passwordEncoder.encode("Admin1234!"))
                    .role("ADMIN")
                    .build();
            userRepository.save(admin);
            System.out.println("[DataInitializer] Default admin user created: admin@journey.dev / Admin1234!");
        }
    }
}
