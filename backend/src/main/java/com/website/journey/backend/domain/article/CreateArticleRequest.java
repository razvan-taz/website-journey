package com.website.journey.backend.domain.article;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateArticleRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String body;

    @NotBlank
    private String slug;

    @NotBlank
    private String author;

    private LocalDate publishDate;
    private String thumbnailUrl;
    private String type;
    private String tag;
}
