ALTER TABLE newsletter_subscribers
    ADD COLUMN unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX idx_newsletter_unsubscribe_token
    ON newsletter_subscribers(unsubscribe_token);
