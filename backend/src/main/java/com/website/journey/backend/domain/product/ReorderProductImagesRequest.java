package com.website.journey.backend.domain.product;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReorderProductImagesRequest {

    @NotEmpty(message = "Ordered IDs must not be empty")
    private List<Long> orderedIds;
}
