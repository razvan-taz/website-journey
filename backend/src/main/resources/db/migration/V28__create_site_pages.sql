CREATE TABLE site_pages (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,
    content TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO site_pages (slug, content, updated_at) VALUES
('tos', 'Terms of Service content goes here.', NOW()),
('privacy', 'Privacy Policy content goes here.', NOW());
