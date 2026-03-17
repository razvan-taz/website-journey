CREATE TABLE stream_schedule (
    id BIGSERIAL PRIMARY KEY,
    day_of_week INT NOT NULL UNIQUE,
    day_name VARCHAR(20) NOT NULL,
    content VARCHAR(500) NOT NULL DEFAULT 'No Schedule'
);

INSERT INTO stream_schedule (day_of_week, day_name, content) VALUES
(0, 'Monday', 'No Schedule'),
(1, 'Tuesday', 'No Schedule'),
(2, 'Wednesday', 'No Schedule'),
(3, 'Thursday', 'No Schedule'),
(4, 'Friday', 'No Schedule'),
(5, 'Saturday', 'No Schedule'),
(6, 'Sunday', 'No Schedule');
