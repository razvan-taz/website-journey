ALTER TABLE email_config ADD COLUMN ssl_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Port 465 always uses SSL; update existing row accordingly
UPDATE email_config SET ssl_enabled = TRUE WHERE smtp_port = 465;
