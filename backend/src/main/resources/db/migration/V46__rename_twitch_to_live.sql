ALTER TABLE twitch_status RENAME TO live_status;
UPDATE social_links SET platform = 'LIVE' WHERE platform = 'TWITCH';
UPDATE nav_layout SET item_key = 'live' WHERE item_key = 'twitch';
