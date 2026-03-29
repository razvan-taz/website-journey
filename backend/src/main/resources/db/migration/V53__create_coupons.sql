CREATE TABLE coupons (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(30) NOT NULL,
    value NUMERIC(10, 2),
    cap NUMERIC(10, 2),
    min_order_value NUMERIC(10, 2),
    target_product_id BIGINT,
    target_category VARCHAR(100),
    free_shipping BOOLEAN NOT NULL DEFAULT FALSE,
    first_order_only BOOLEAN NOT NULL DEFAULT FALSE,
    single_use BOOLEAN NOT NULL DEFAULT FALSE,
    usage_limit INTEGER,
    per_user_limit INTEGER,
    expires_at TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_coupons_code ON coupons(code);
