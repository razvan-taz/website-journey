package com.website.journey.backend.domain.schedule;

public record StreamScheduleDto(
        int dayOfWeek,
        String dayName,
        String startTime,
        String endTime,
        String description
) {
}
