package com.website.journey.backend.domain.search;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public ResponseEntity<SearchResponseDto> search(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        List<SearchResultDto> rawResults = searchService.search(q);

        List<SearchItemDto> wrappedResults = rawResults.stream()
                .map(item -> new SearchItemDto(item, null, null))
                .toList();

        SearchResponseDto response = new SearchResponseDto(
                wrappedResults,
                null,
                q,
                page,
                size,
                rawResults.size()
        );

        return ResponseEntity.ok(response);
    }
}
