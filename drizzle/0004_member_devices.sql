-- Run once, after 0003_normalize_data.sql.
-- Existing sessions remain unlinked until their owner chooses a roster member.
-- expires = 0 means no server-side expiry; retain all existing expiry values.
ALTER TABLE players ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE member_devices (
  hash TEXT PRIMARY KEY NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id)
);
--> statement-breakpoint
ALTER TABLE sessions ADD COLUMN device_hash TEXT REFERENCES member_devices(hash);
--> statement-breakpoint
-- Bootstrap only the two current administrators by their complete roster names.
-- Future authorization uses is_admin, even when a member's name is edited.
UPDATE players
SET is_admin = 1
WHERE sort_order IS NOT NULL
  AND replace(replace(name, ' ', ''), '　', '') IN ('安曇幸寛', '戸田朋幸');
