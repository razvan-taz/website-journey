CREATE TABLE faq_items (
    id BIGSERIAL PRIMARY KEY,
    question VARCHAR(500) NOT NULL,
    answer TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0
);
