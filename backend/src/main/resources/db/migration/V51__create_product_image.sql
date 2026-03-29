CREATE TABLE product_image (
    id            BIGSERIAL PRIMARY KEY,
    product_id    BIGINT       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url           VARCHAR(2048) NOT NULL,
    display_order INT          NOT NULL DEFAULT 0
);

CREATE INDEX idx_product_image_product_id ON product_image(product_id);
