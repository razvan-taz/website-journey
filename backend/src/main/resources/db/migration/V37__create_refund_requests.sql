CREATE TABLE IF NOT EXISTS refund_requests (
    id               BIGSERIAL PRIMARY KEY,
    order_id         BIGINT       NOT NULL REFERENCES orders(id),
    user_id          BIGINT       REFERENCES users(id),
    reason           VARCHAR(500) NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    requested_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    processed_at     TIMESTAMP,
    processed_by     VARCHAR(255),
    stripe_refund_id VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_order_id ON refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status   ON refund_requests(status);
