ALTER TABLE orders ADD COLUMN payment_intent_id VARCHAR(255);
CREATE INDEX idx_orders_payment_intent_id ON orders(payment_intent_id);
