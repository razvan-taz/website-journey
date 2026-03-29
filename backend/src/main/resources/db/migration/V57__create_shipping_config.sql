CREATE TABLE shipping_config (
    id       BIGINT PRIMARY KEY,
    price    NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3)     NOT NULL DEFAULT 'EUR',
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO shipping_config (id, price, currency, updated_at)
VALUES (1, 0.00, 'EUR', CURRENT_TIMESTAMP);
