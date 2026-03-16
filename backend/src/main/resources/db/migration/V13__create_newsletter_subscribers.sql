CREATE TABLE newsletter_subscribers (
    id           BIGSERIAL PRIMARY KEY,
    email        VARCHAR(255) NOT NULL UNIQUE,
    subscribed_at TIMESTAMP   NOT NULL DEFAULT NOW()
);
