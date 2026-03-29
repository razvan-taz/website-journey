ALTER TABLE coupon_usage ADD CONSTRAINT uk_coupon_usage_coupon_user_order UNIQUE (coupon_id, user_id, order_id);
