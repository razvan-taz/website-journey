package com.website.journey.backend.domain.user;

import com.website.journey.backend.domain.order.OrderRepository;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    public AdminUserController(UserRepository userRepository, OrderRepository orderRepository) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
    }

    @GetMapping
    public Page<AdminUserDto> listUsers(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<User> users;
        if (search != null && !search.isBlank()) {
            users = userRepository.findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
                    search.trim(), search.trim(), pageable);
        } else {
            users = userRepository.findAll(pageable);
        }

        // SH-003-07: batch order count — one query for the whole page instead of N individual queries
        List<Long> userIds = users.getContent().stream().map(User::getId).toList();
        Map<Long, Long> orderCounts = orderRepository.countOrdersByUserIds(userIds).stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> (Long) row[1]
                ));

        List<AdminUserDto> dtos = users.getContent().stream()
                .map(u -> new AdminUserDto(
                        u.getId(),
                        u.getEmail(),
                        u.getName(),
                        u.getRole(),
                        u.isEnabled(),
                        u.isEmailVerified(),
                        u.getCreatedAt(),
                        orderCounts.getOrDefault(u.getId(), 0L)
                ))
                .toList();

        return new PageImpl<>(dtos, pageable, users.getTotalElements());
    }

    @PatchMapping("/{id}/enabled")
    public AdminUserDto setEnabled(@PathVariable Long id, @RequestBody EnabledRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // SH-003-03: prevent admin from disabling their own account
        if (!request.enabled()) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && user.getEmail().equals(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot disable your own account");
            }
        }

        user.setEnabled(request.enabled());
        User saved = userRepository.save(user);
        return toDto(saved);
    }

    @PatchMapping("/{id}/role")
    public AdminUserDto setRole(@PathVariable Long id, @RequestBody RoleRequest request) {
        if (!"USER".equals(request.role()) && !"ADMIN".equals(request.role())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role must be USER or ADMIN");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // SH-003-03: prevent demoting the last ADMIN to USER
        if ("USER".equals(request.role()) && "ADMIN".equals(user.getRole())) {
            long adminCount = userRepository.countByRole("ADMIN");
            if (adminCount <= 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Cannot demote the last admin. Promote another user first.");
            }
        }

        user.setRole(request.role());
        User saved = userRepository.save(user);
        return toDto(saved);
    }

    private AdminUserDto toDto(User u) {
        return new AdminUserDto(
                u.getId(),
                u.getEmail(),
                u.getName(),
                u.getRole(),
                u.isEnabled(),
                u.isEmailVerified(),
                u.getCreatedAt(),
                orderRepository.countByUserId(u.getId())  // single-row fetch is fine here — only used after enable/role patch
        );
    }

    public record EnabledRequest(boolean enabled) {}

    public record RoleRequest(@NotBlank String role) {}
}
