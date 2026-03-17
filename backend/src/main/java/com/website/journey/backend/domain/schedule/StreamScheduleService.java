package com.website.journey.backend.domain.schedule;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class StreamScheduleService {

    private final StreamScheduleRepository streamScheduleRepository;

    public StreamScheduleService(StreamScheduleRepository streamScheduleRepository) {
        this.streamScheduleRepository = streamScheduleRepository;
    }

    @Transactional(readOnly = true)
    public List<StreamScheduleDto> getAll() {
        return streamScheduleRepository.findAllByOrderByDayOfWeekAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public List<StreamScheduleDto> update(UpdateScheduleRequest request) {
        for (UpdateScheduleRequest.UpdateScheduleRow row : request.rows()) {
            StreamScheduleEntry entry = streamScheduleRepository.findByDayOfWeek(row.dayOfWeek())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Schedule entry not found for day: " + row.dayOfWeek()));
            entry.setContent(row.content());
            streamScheduleRepository.save(entry);
        }
        return streamScheduleRepository.findAllByOrderByDayOfWeekAsc().stream()
                .map(this::toDto)
                .toList();
    }

    private StreamScheduleDto toDto(StreamScheduleEntry entry) {
        return new StreamScheduleDto(
                entry.getDayOfWeek(),
                entry.getDayName(),
                entry.getContent()
        );
    }
}
