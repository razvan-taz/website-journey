CREATE TABLE newsletter_drafts (
    id         BIGSERIAL PRIMARY KEY,
    subject    VARCHAR(500) NOT NULL,
    body       TEXT         NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
