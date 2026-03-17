package com.website.journey.backend.domain.contact;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ContactFormRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotBlank String message
) {
}
