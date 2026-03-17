CREATE TABLE social_links (
    id BIGSERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL UNIQUE,
    url VARCHAR(500) NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO social_links (platform, url, enabled) VALUES
('TWITCH', '', false),
('DISCORD', '', false),
('TWITTER', '', false),
('YOUTUBE', '', false),
('TIKTOK', '', false),
('INSTAGRAM', '', false);
