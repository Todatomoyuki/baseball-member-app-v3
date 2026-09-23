-- Run once, after 0000-0002. Legacy JSON rows are retained unchanged as backups.
-- Array positions are zero-based. Former players keep NULL sort_order.
CREATE TABLE app_revisions (
  scope TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  write_token TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE players (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  kana TEXT NOT NULL,
  sort_order INTEGER,
  bench_order INTEGER,
  absent_order INTEGER
);
--> statement-breakpoint
CREATE INDEX players_active_sort_order_idx ON players(sort_order) WHERE sort_order IS NOT NULL;
--> statement-breakpoint
CREATE TABLE team_settings (
  id INTEGER PRIMARY KEY NOT NULL,
  team_name TEXT NOT NULL,
  manager TEXT NOT NULL,
  tournament TEXT NOT NULL,
  game_date TEXT NOT NULL,
  opponent TEXT NOT NULL,
  mode TEXT NOT NULL,
  pitcher_id TEXT REFERENCES players(id)
);
--> statement-breakpoint
CREATE TABLE name_options (
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (kind, name)
);
--> statement-breakpoint
CREATE TABLE lineup_slots (
  batting_order INTEGER PRIMARY KEY NOT NULL,
  position TEXT NOT NULL,
  player_id TEXT REFERENCES players(id)
);
--> statement-breakpoint
CREATE TABLE equipment_items (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  holder_id TEXT REFERENCES players(id),
  note TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE stats_games (
  game_date TEXT NOT NULL,
  game_number INTEGER NOT NULL,
  PRIMARY KEY (game_date, game_number)
);
--> statement-breakpoint
CREATE TABLE player_game_stats (
  game_date TEXT NOT NULL,
  game_number INTEGER NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id),
  rbis INTEGER NOT NULL DEFAULT 0,
  runs INTEGER NOT NULL DEFAULT 0,
  stolen_bases INTEGER NOT NULL DEFAULT 0,
  caught_stealing_attempts INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  caught_stealing INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (game_date, game_number, player_id),
  FOREIGN KEY (game_date, game_number) REFERENCES stats_games(game_date, game_number) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE plate_appearances (
  game_date TEXT NOT NULL,
  game_number INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  appearance_order INTEGER NOT NULL,
  result TEXT,
  scoring_position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (game_date, game_number, player_id, appearance_order),
  FOREIGN KEY (game_date, game_number, player_id) REFERENCES player_game_stats(game_date, game_number, player_id) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO app_revisions (scope, revision)
VALUES
  ('team', COALESCE((SELECT revision FROM team_state WHERE id = 1), 0)),
  ('equipment', COALESCE((SELECT revision FROM equipment_state WHERE id = 1), 0)),
  ('stats', COALESCE((SELECT revision FROM stats_state WHERE id = 1), 0));
--> statement-breakpoint
INSERT INTO players (id, name, number, kana, sort_order, bench_order, absent_order)
SELECT
  CAST(json_extract(p.value, '$.id') AS TEXT),
  COALESCE(json_extract(p.value, '$.name'), ''),
  COALESCE(json_extract(p.value, '$.number'), ''),
  COALESCE(json_extract(p.value, '$.kana'), ''),
  CAST(p.key AS INTEGER),
  (SELECT MIN(CAST(b.key AS INTEGER)) FROM json_each(t.data, '$.benchOrder') b WHERE b.value = json_extract(p.value, '$.id')),
  (SELECT MIN(CAST(a.key AS INTEGER)) FROM json_each(t.data, '$.absentIds') a WHERE a.value = json_extract(p.value, '$.id'))
FROM team_state t, json_each(t.data, '$.players') p
WHERE t.id = 1;
--> statement-breakpoint
-- Retain references even when a player has already left the roster.
INSERT OR IGNORE INTO players (id, name, number, kana)
SELECT CAST(json_extract(e.value, '$.holderId') AS TEXT), '', '', ''
FROM equipment_state s, json_each(s.data, '$.items') e
WHERE s.id = 1 AND COALESCE(json_extract(e.value, '$.holderId'), '') <> ''
UNION
SELECT CAST(json_extract(s.value, '$.playerId') AS TEXT), '', '', ''
FROM team_state t, json_each(t.data, '$.slots') s
WHERE t.id = 1 AND json_extract(s.value, '$.playerId') IS NOT NULL
UNION
SELECT CAST(json_extract(data, '$.pitcher') AS TEXT), '', '', ''
FROM team_state
WHERE id = 1 AND json_extract(data, '$.pitcher') IS NOT NULL;
--> statement-breakpoint
WITH source AS (SELECT COALESCE((SELECT data FROM team_state WHERE id = 1), '{}') AS data)
INSERT INTO team_settings (id, team_name, manager, tournament, game_date, opponent, mode, pitcher_id)
SELECT
  1,
  COALESCE(json_extract(data, '$.teamName'), 'YGファイヤーズ'),
  CASE WHEN length(trim(COALESCE(json_extract(data, '$.manager'), ''), '　 ' || char(9) || char(10) || char(13))) > 0
    THEN json_extract(data, '$.manager') ELSE '池原　海斗' END,
  COALESCE(json_extract(data, '$.tournament'), ''),
  COALESCE(NULLIF(json_extract(data, '$.date'), ''), date('now', '+9 hours', '+1 day', 'weekday 6')),
  COALESCE(json_extract(data, '$.opponent'), ''),
  COALESCE(json_extract(data, '$.mode'), 'normal'),
  json_extract(data, '$.pitcher')
FROM source;
--> statement-breakpoint
INSERT INTO name_options (kind, name, sort_order)
SELECT 'tournament', CAST(o.value AS TEXT), MIN(CAST(o.key AS INTEGER))
FROM team_state t, json_each(t.data, '$.tournaments') o
WHERE t.id = 1
GROUP BY o.value
UNION ALL
SELECT 'opponent', CAST(o.value AS TEXT), MIN(CAST(o.key AS INTEGER))
FROM team_state t, json_each(t.data, '$.opponents') o
WHERE t.id = 1
GROUP BY o.value;
--> statement-breakpoint
WITH source AS (SELECT COALESCE((SELECT data FROM team_state WHERE id = 1), '{}') AS data)
INSERT INTO lineup_slots (batting_order, position, player_id)
SELECT CAST(s.key AS INTEGER), json_extract(s.value, '$.position'), json_extract(s.value, '$.playerId')
FROM source, json_each(CASE WHEN json_type(data, '$.slots') = 'array' THEN json_extract(data, '$.slots')
  ELSE '[{"position":"投"},{"position":"捕"},{"position":"一"},{"position":"二"},{"position":"三"},{"position":"遊"},{"position":"左"},{"position":"中"},{"position":"右"}]' END) s;
--> statement-breakpoint
-- Duplicate IDs must fail instead of silently discarding an existing item.
INSERT INTO equipment_items (id, name, holder_id, note, sort_order)
SELECT
  CAST(json_extract(e.value, '$.id') AS TEXT),
  COALESCE(json_extract(e.value, '$.name'), ''),
  NULLIF(CAST(json_extract(e.value, '$.holderId') AS TEXT), ''),
  COALESCE(json_extract(e.value, '$.note'), ''),
  CAST(e.key AS INTEGER)
FROM equipment_state s, json_each(s.data, '$.items') e
WHERE s.id = 1
ORDER BY CAST(e.key AS INTEGER);
--> statement-breakpoint
-- Staging tables avoid repeatedly expanding the full stats JSON. Ordinary tables
-- are used because D1 migration statements need not share a TEMP-table session.
CREATE TABLE _migration_0003_games (
  game_date TEXT NOT NULL,
  game_number INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (game_date, game_number)
);
--> statement-breakpoint
WITH entries AS (
  SELECT CAST(g.key AS TEXT) AS game_key, g.id AS source_order,
    CASE WHEN g.type = 'object' THEN g.value ELSE '{}' END AS data
  FROM stats_state s, json_each(s.data, '$.games') g
  WHERE s.id = 1 AND json_type(s.data, '$.games') = 'object'
), parsed AS (
  SELECT substr(game_key, 1, 10) AS game_date,
    CASE WHEN length(game_key) = 10 THEN 1 ELSE CAST(substr(game_key, 12) AS INTEGER) END AS game_number,
    data, source_order
  FROM entries
  WHERE substr(game_key, 1, 10) GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND (length(game_key) = 10 OR (
      substr(game_key, 11, 1) = '|' AND length(game_key) > 11
      AND substr(game_key, 12) NOT GLOB '*[^0-9]*'
      AND CAST(substr(game_key, 12) AS INTEGER) BETWEEN 1 AND 9007199254740991
    ))
)
INSERT OR REPLACE INTO _migration_0003_games (game_date, game_number, data)
SELECT game_date, game_number, data FROM parsed ORDER BY source_order;
--> statement-breakpoint
-- Old { gameDate, players } format is the fallback only when games had no valid keys.
INSERT INTO _migration_0003_games (game_date, game_number, data)
SELECT json_extract(data, '$.gameDate'), 1,
  CASE WHEN json_type(data, '$.players') = 'object' THEN json_extract(data, '$.players') ELSE '{}' END
FROM stats_state
WHERE id = 1
  AND json_type(data, '$.gameDate') = 'text'
  AND json_extract(data, '$.gameDate') GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  AND NOT EXISTS (SELECT 1 FROM _migration_0003_games);
--> statement-breakpoint
CREATE TABLE _migration_0003_player_stats AS
SELECT g.game_date, g.game_number, CAST(p.key AS TEXT) AS player_id, p.value AS data
FROM _migration_0003_games g, json_each(g.data) p
WHERE p.type IN ('object', 'array');
--> statement-breakpoint
INSERT OR IGNORE INTO players (id, name, number, kana)
SELECT DISTINCT player_id, '', '', '' FROM _migration_0003_player_stats;
--> statement-breakpoint
INSERT INTO stats_games (game_date, game_number)
SELECT game_date, game_number FROM _migration_0003_games;
--> statement-breakpoint
-- Match normalizeStatsData: invalid, fractional, negative and unsafe counters become 0.
INSERT INTO player_game_stats (game_date, game_number, player_id, rbis, runs, stolen_bases, caught_stealing_attempts, errors, caught_stealing)
SELECT game_date, game_number, player_id,
  CASE WHEN json_type(data, '$.rbis') IN ('integer', 'real')
    AND json_extract(data, '$.rbis') BETWEEN 0 AND 9007199254740991
    AND CAST(json_extract(data, '$.rbis') AS INTEGER) = json_extract(data, '$.rbis')
    THEN CAST(json_extract(data, '$.rbis') AS INTEGER) ELSE 0 END,
  CASE WHEN json_type(data, '$.runs') IN ('integer', 'real')
    AND json_extract(data, '$.runs') BETWEEN 0 AND 9007199254740991
    AND CAST(json_extract(data, '$.runs') AS INTEGER) = json_extract(data, '$.runs')
    THEN CAST(json_extract(data, '$.runs') AS INTEGER) ELSE 0 END,
  CASE WHEN json_type(data, '$.stolenBases') IN ('integer', 'real')
    AND json_extract(data, '$.stolenBases') BETWEEN 0 AND 9007199254740991
    AND CAST(json_extract(data, '$.stolenBases') AS INTEGER) = json_extract(data, '$.stolenBases')
    THEN CAST(json_extract(data, '$.stolenBases') AS INTEGER) ELSE 0 END,
  CASE WHEN json_type(data, '$.caughtStealingAttempts') IN ('integer', 'real')
    AND json_extract(data, '$.caughtStealingAttempts') BETWEEN 0 AND 9007199254740991
    AND CAST(json_extract(data, '$.caughtStealingAttempts') AS INTEGER) = json_extract(data, '$.caughtStealingAttempts')
    THEN CAST(json_extract(data, '$.caughtStealingAttempts') AS INTEGER) ELSE 0 END,
  CASE WHEN json_type(data, '$.errors') IN ('integer', 'real')
    AND json_extract(data, '$.errors') BETWEEN 0 AND 9007199254740991
    AND CAST(json_extract(data, '$.errors') AS INTEGER) = json_extract(data, '$.errors')
    THEN CAST(json_extract(data, '$.errors') AS INTEGER) ELSE 0 END,
  CASE WHEN json_type(data, '$.caughtStealing') IN ('integer', 'real')
    AND json_extract(data, '$.caughtStealing') BETWEEN 0 AND 9007199254740991
    AND CAST(json_extract(data, '$.caughtStealing') AS INTEGER) = json_extract(data, '$.caughtStealing')
    THEN CAST(json_extract(data, '$.caughtStealing') AS INTEGER) ELSE 0 END
FROM _migration_0003_player_stats;
--> statement-breakpoint
-- Keep appearance order and pad every player to at least five appearances.
WITH RECURSIVE player_appearances AS (
  SELECT game_date, game_number, player_id, data,
    MAX(5, CASE WHEN json_type(data, '$.plateAppearances') = 'array' THEN json_array_length(data, '$.plateAppearances') ELSE 0 END) AS count
  FROM _migration_0003_player_stats
), appearance_numbers(appearance_order) AS (
  SELECT 0 WHERE EXISTS (SELECT 1 FROM player_appearances)
  UNION ALL
  SELECT appearance_order + 1 FROM appearance_numbers
  WHERE appearance_order + 1 < (SELECT MAX(count) FROM player_appearances)
)
INSERT INTO plate_appearances (game_date, game_number, player_id, appearance_order, result, scoring_position)
SELECT p.game_date, p.game_number, p.player_id, n.appearance_order,
  CASE WHEN json_type(p.data, '$.plateAppearances') = 'array'
    AND json_extract(p.data, '$.plateAppearances[' || n.appearance_order || ']') IN
      ('安打', '二塁打', '三塁打', '本塁打', '凡退', '三振', '四球', '死球', '犠打', '犠飛', '併殺打', '敵失', 'エンドラン')
    THEN json_extract(p.data, '$.plateAppearances[' || n.appearance_order || ']') ELSE NULL END,
  CASE WHEN json_type(p.data, '$.scoringPosition') = 'array'
    AND json_type(p.data, '$.scoringPosition[' || n.appearance_order || ']') = 'true' THEN 1 ELSE 0 END
FROM player_appearances p JOIN appearance_numbers n ON n.appearance_order < p.count;
--> statement-breakpoint
DROP TABLE _migration_0003_player_stats;
--> statement-breakpoint
DROP TABLE _migration_0003_games;
