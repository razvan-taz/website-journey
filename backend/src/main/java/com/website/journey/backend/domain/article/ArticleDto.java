package com.website.journey.backend.domain.article;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleDto {

    private Long id;
    private String title;
    private String slug;
    private String author;
    private LocalDate publishDate;
    private String thumbnailUrl;
    private String type;
    private String tag;
}
