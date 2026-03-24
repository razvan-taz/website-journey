package com.website.journey.backend.domain.live;

import org.springframework.stereotype.Service;

@Service
public class LiveStatusService {

    private final LiveStatusRepository repository;

    public LiveStatusService(LiveStatusRepository repository) {
        this.repository = repository;
    }

    public LiveStatusDto get() {
        LiveStatus status = repository.findById(1L).orElseThrow();
        return toDto(status);
    }

    public LiveStatusDto update(UpdateLiveStatusRequest request) {
        LiveStatus status = repository.findById(1L).orElseThrow();
        status.setEnabled(request.enabled());
        status.setUrl(request.url() != null ? request.url() : "");
        status.setLive(request.live());
        return toDto(repository.save(status));
    }

    private LiveStatusDto toDto(LiveStatus s) {
        return new LiveStatusDto(s.isEnabled(), s.getUrl(), s.isLive());
    }
}
