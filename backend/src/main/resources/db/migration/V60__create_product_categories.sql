CREATE TABLE product_categories (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO product_categories (name) VALUES ('Apparel'), ('Accessories'), ('Digital');
