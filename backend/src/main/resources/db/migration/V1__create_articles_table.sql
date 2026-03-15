CREATE TABLE articles (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(255)            NOT NULL,
    body        TEXT                    NOT NULL,
    slug        VARCHAR(255) UNIQUE     NOT NULL,
    author      VARCHAR(255)            NOT NULL,
    publish_date DATE,
    thumbnail_url VARCHAR(500),
    type        VARCHAR(50),
    tag         VARCHAR(100),
    created_at  TIMESTAMP               NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP               NOT NULL DEFAULT NOW()
);
