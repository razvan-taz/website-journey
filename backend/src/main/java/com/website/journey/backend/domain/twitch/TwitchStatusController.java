package com.website.journey.backend.domain.twitch;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TwitchStatusController {

    private final TwitchStatusService twitchStatusService;

    public TwitchStatusController(TwitchStatusService twitchStatusService) {
        this.twitchStatusService = twitchStatusService;
    }

    @GetMapping("/api/site/twitch-status")
    public ResponseEntity<TwitchStatusDto> getPublic() {
        return ResponseEntity.ok(twitchStatusService.get());
    }

    @GetMapping("/api/admin/twitch-status")
    public ResponseEntity<TwitchStatusDto> getAdmin() {
        return ResponseEntity.ok(twitchStatusService.get());
    }

    @PutMapping("/api/admin/twitch-status")
    public ResponseEntity<TwitchStatusDto> update(@RequestBody UpdateTwitchStatusRequest request) {
        return ResponseEntity.ok(twitchStatusService.update(request));
    }
}
