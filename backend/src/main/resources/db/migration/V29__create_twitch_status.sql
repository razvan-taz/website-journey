CREATE TABLE twitch_status (
    id BIGINT PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    url VARCHAR(255) NOT NULL DEFAULT '',
    is_live BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO twitch_status (id, enabled, url, is_live) VALUES (1, false, '', false);
