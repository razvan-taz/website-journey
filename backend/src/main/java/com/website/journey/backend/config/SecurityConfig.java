package com.website.journey.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> {})  // delegates to WebConfig's CorsRegistry
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/register", "/api/auth/login",
                                "/api/auth/verify", "/api/auth/forgot-password",
                                "/api/auth/reset-password").permitAll()
                        .requestMatchers("/api/site/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/contact").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/articles/**").permitAll()
                        // Specific product endpoints that override the broad GET permitAll below
                        .requestMatchers(HttpMethod.GET, "/api/products/*/reviews/eligibility").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/products/*/reviews").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/products/*/reviews/mine").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/articles/id/*/comments").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/articles/id/*/comments").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/products/*/comments").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/products/*/comments").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/comments/**").authenticated()
                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers("/api/wishlist/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/search/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/orders").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/orders/*/refund-request").authenticated()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/sitemap.xml").permitAll()
                        .requestMatchers("/robots.txt").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/newsletter/subscribe").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/newsletter/unsubscribe").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/discount/validate").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/payments/config").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/payments/webhook").permitAll()
                        // Admin endpoints require ADMIN role
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // Write operations require ADMIN role
                        .requestMatchers(HttpMethod.POST, "/api/articles/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/articles/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/articles/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasRole("ADMIN")
                        // Everything else requires authentication
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
