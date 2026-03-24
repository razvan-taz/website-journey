package com.website.journey.backend.domain.live;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LiveStatusController {

    private final LiveStatusService liveStatusService;

    public LiveStatusController(LiveStatusService liveStatusService) {
        this.liveStatusService = liveStatusService;
    }

    @GetMapping("/api/site/live-status")
    public ResponseEntity<LiveStatusDto> getPublic() {
        return ResponseEntity.ok(liveStatusService.get());
    }

    @GetMapping("/api/admin/live-status")
    public ResponseEntity<LiveStatusDto> getAdmin() {
        return ResponseEntity.ok(liveStatusService.get());
    }

    @PutMapping("/api/admin/live-status")
    public ResponseEntity<LiveStatusDto> update(@RequestBody UpdateLiveStatusRequest request) {
        return ResponseEntity.ok(liveStatusService.update(request));
    }
}
