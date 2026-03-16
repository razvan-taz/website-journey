CREATE TABLE discount_codes (
    id             BIGSERIAL     PRIMARY KEY,
    code           VARCHAR(50)   NOT NULL UNIQUE,
    discount_type  VARCHAR(20)   NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED')),
    discount_value NUMERIC(10,2) NOT NULL,
    max_uses       INTEGER,
    uses           INTEGER       NOT NULL DEFAULT 0,
    active         BOOLEAN       NOT NULL DEFAULT TRUE,
    expires_at     TIMESTAMP,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);

ALTER TABLE orders
    ADD COLUMN discount_code   VARCHAR(50),
    ADD COLUMN discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
