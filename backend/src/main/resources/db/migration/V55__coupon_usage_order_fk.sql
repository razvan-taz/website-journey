ALTER TABLE coupon_usage
    ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE coupon_usage
    ADD CONSTRAINT fk_coupon_usage_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
