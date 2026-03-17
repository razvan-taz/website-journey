package com.website.journey.backend.domain.schedule;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class StreamScheduleController {

    private final StreamScheduleService streamScheduleService;

    public StreamScheduleController(StreamScheduleService streamScheduleService) {
        this.streamScheduleService = streamScheduleService;
    }

    @GetMapping("/api/site/schedule")
    public ResponseEntity<List<StreamScheduleDto>> getSchedulePublic() {
        return ResponseEntity.ok(streamScheduleService.getAll());
    }

    @GetMapping("/api/admin/schedule")
    public ResponseEntity<List<StreamScheduleDto>> getScheduleAdmin() {
        return ResponseEntity.ok(streamScheduleService.getAll());
    }

    @PutMapping("/api/admin/schedule")
    public ResponseEntity<List<StreamScheduleDto>> update(@RequestBody UpdateScheduleRequest request) {
        return ResponseEntity.ok(streamScheduleService.update(request));
    }
}
