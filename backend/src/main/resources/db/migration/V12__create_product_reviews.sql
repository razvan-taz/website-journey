CREATE TABLE product_reviews (
    id         BIGSERIAL PRIMARY KEY,
    product_id BIGINT       NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rating     SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body       TEXT,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, user_id)
);

CREATE INDEX idx_reviews_product ON product_reviews (product_id);
