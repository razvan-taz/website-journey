package com.website.journey.backend.domain.product;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddProductImageRequest {

    @NotBlank(message = "Image URL must not be blank")
    private String url;
}
