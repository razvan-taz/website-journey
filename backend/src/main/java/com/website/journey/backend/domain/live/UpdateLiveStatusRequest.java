package com.website.journey.backend.domain.live;

public record UpdateLiveStatusRequest(boolean enabled, String url, boolean live) {}
