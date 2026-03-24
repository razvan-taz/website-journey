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
VALUES (1, 'smtp.mail.yahoo.com', 587, 'razvan.miron8@yahoo.com', '', 'Website Journey', 'razvan.miron8@yahoo.com', NOW())
ON CONFLICT (id) DO NOTHING;
