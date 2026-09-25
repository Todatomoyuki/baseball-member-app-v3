-- Apply once after 0008_schedule_updates.sql, before the updated app and worker.
ALTER TABLE schedule_games ADD previous_start_time TEXT;
--> statement-breakpoint
ALTER TABLE schedule_games ADD previous_location TEXT;
--> statement-breakpoint
ALTER TABLE schedule_games ADD changed_by TEXT REFERENCES players(id);
--> statement-breakpoint
-- Older versions also counted title/date changes; start the narrower notice
-- policy from this migration so those old revisions cannot trigger an alert.
UPDATE schedule_responses SET confirmed_revision=(SELECT details_revision FROM schedule_games WHERE id=schedule_id);
--> statement-breakpoint
CREATE TABLE schedule_lineups (
  schedule_id TEXT PRIMARY KEY NOT NULL REFERENCES schedule_games(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  pitcher_id TEXT REFERENCES players(id)
);
--> statement-breakpoint
CREATE TABLE schedule_lineup_slots (
  schedule_id TEXT NOT NULL REFERENCES schedule_lineups(schedule_id) ON DELETE CASCADE,
  batting_order INTEGER NOT NULL,
  position TEXT NOT NULL,
  player_id TEXT REFERENCES players(id),
  PRIMARY KEY (schedule_id, batting_order)
);
--> statement-breakpoint
-- Register existing places as shared search candidates, without duplicating names.
WITH places AS (
  SELECT trim(location) AS name FROM schedule_games WHERE trim(location)<>''
  UNION SELECT trim(location) FROM team_settings WHERE trim(location)<>''
), missing AS (
  SELECT name FROM places WHERE NOT EXISTS (SELECT 1 FROM name_options WHERE kind='location' AND name=places.name)
  ORDER BY name LIMIT 200
)
INSERT INTO name_options(kind,name,sort_order)
SELECT 'location',name,ROW_NUMBER() OVER (ORDER BY name)-1+COALESCE((SELECT MAX(sort_order)+1 FROM name_options WHERE kind='location'),0)
FROM missing;
--> statement-breakpoint
UPDATE app_revisions SET revision=revision+1,write_token='' WHERE scope IN ('team','schedule');
