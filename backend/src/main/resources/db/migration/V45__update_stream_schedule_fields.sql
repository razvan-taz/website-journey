ALTER TABLE stream_schedule DROP COLUMN content;
ALTER TABLE stream_schedule ADD COLUMN start_time VARCHAR(10) NOT NULL DEFAULT '';
ALTER TABLE stream_schedule ADD COLUMN end_time VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE stream_schedule ADD COLUMN description VARCHAR(500) NOT NULL DEFAULT '';
