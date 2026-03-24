CREATE TABLE user_notifications (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    message    TEXT         NOT NULL,
    type       VARCHAR(50)  NOT NULL,
    order_id   BIGINT,
    reviewed   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL
);

CREATE INDEX idx_user_notifications_user ON user_notifications(user_id, reviewed);
