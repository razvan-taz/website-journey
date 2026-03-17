package com.website.journey.backend.domain.twitch;

public record UpdateTwitchStatusRequest(boolean enabled, String url, boolean live) {}
