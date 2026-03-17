package com.website.journey.backend.domain.schedule;

public record StreamScheduleDto(
        int dayOfWeek,
        String dayName,
        String content
) {
}
