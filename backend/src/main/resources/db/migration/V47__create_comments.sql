CREATE TABLE comments (
    id            BIGSERIAL PRIMARY KEY,
    content       TEXT         NOT NULL,
    author_id     BIGINT       NOT NULL,
    author_name   VARCHAR(255) NOT NULL,
    target_type   VARCHAR(20)  NOT NULL,
    target_id     BIGINT       NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP    NOT NULL
);

CREATE INDEX idx_comments_target ON comments(target_type, target_id, status);
CREATE INDEX idx_comments_author  ON comments(author_id);
