package com.website.journey.backend.domain.twitch;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "twitch_status")
public class TwitchStatus {

    @Id
    private Long id = 1L;

    @Column(nullable = false)
    private boolean enabled;

    @Column(nullable = false)
    private String url;

    @Column(name = "is_live", nullable = false)
    private boolean isLive;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public boolean isLive() { return isLive; }
    public void setLive(boolean live) { isLive = live; }
}
