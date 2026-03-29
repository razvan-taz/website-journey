-- MODIFIED: replaced personal email with placeholder (razvan.miron8@yahoo.com → admin@example.com)
-- NOTE: This file was modified after initial execution. Run `mvn flyway:repair` to update the checksum before the next startup.
CREATE TABLE IF NOT EXISTS email_config (
    id          BIGINT PRIMARY KEY,
    smtp_host   VARCHAR(255) NOT NULL,
    smtp_port   INT          NOT NULL,
    username    VARCHAR(255) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    from_name   VARCHAR(100) NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO email_config (id, smtp_host, smtp_port, username, password, from_name, from_address, updated_at)
VALUES (1, 'smtp.mail.yahoo.com', 587, 'admin@example.com', '', 'Website Journey', 'admin@example.com', NOW())
ON CONFLICT (id) DO NOTHING;
