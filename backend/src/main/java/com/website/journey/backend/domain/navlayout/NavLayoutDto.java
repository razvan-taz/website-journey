package com.website.journey.backend.domain.navlayout;

public record NavLayoutDto(
        String itemKey,
        String zone,
        int sortOrder,
        Integer heightPx,
        Integer widthPx,
        int offsetX,
        int offsetY
) {}
