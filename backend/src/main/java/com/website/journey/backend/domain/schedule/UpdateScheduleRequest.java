package com.website.journey.backend.domain.schedule;

import java.util.List;

public record UpdateScheduleRequest(
        List<UpdateScheduleRow> rows
) {
    public record UpdateScheduleRow(
            int dayOfWeek,
            String startTime,
            String endTime,
            String description
    ) {
    }
}
