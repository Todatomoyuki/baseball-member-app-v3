-- Run once, after 0004_member_devices.sql and before publishing the new code.
-- Keep lineup editing separate from the existing two-administrator role.
ALTER TABLE players ADD COLUMN can_edit_lineup INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
-- Bootstrap the five current editors by their complete roster names only once.
-- Future authorization follows the stable player ID, including after renaming.
UPDATE players
SET can_edit_lineup = 1
WHERE sort_order IS NOT NULL
  AND replace(replace(name, ' ', ''), '　', '') IN
    ('安曇幸寛', '戸田朋幸', '押野武', '池原海斗', '根岸彪雅');
