package com.website.journey.backend.domain.twitch;

import org.springframework.stereotype.Service;

@Service
public class TwitchStatusService {

    private final TwitchStatusRepository repository;

    public TwitchStatusService(TwitchStatusRepository repository) {
        this.repository = repository;
    }

    public TwitchStatusDto get() {
        TwitchStatus status = repository.findById(1L).orElseThrow();
        return toDto(status);
    }

    public TwitchStatusDto update(UpdateTwitchStatusRequest request) {
        TwitchStatus status = repository.findById(1L).orElseThrow();
        status.setEnabled(request.enabled());
        status.setUrl(request.url() != null ? request.url() : "");
        status.setLive(request.live());
        return toDto(repository.save(status));
    }

    private TwitchStatusDto toDto(TwitchStatus s) {
        return new TwitchStatusDto(s.isEnabled(), s.getUrl(), s.isLive());
    }
}
