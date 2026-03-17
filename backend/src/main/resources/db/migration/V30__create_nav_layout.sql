CREATE TABLE nav_layout (
    item_key   VARCHAR(50) PRIMARY KEY,
    zone       VARCHAR(20) NOT NULL,
    sort_order INT         NOT NULL DEFAULT 0,
    height_px  INT,
    width_px   INT
);

INSERT INTO nav_layout (item_key, zone, sort_order, height_px, width_px) VALUES
('logo',      'above-left',   0, NULL, NULL),
('twitch',    'above-left',   1, NULL, NULL),
('nav-links', 'below-center', 0, NULL, NULL),
('schedule',  'below-center', 1, NULL, NULL),
('search',    'below-center', 2, NULL, NULL),
('cart',      'above-right',  0, NULL, NULL),
('signin',    'above-right',  1, NULL, NULL);
