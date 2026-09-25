-- Run once after 0006_equipment_line_notifications.sql, before deploying the app.
-- Schedules start empty; existing team, equipment and statistics data are retained.
CREATE TABLE `schedule_games` (
    `id` text PRIMARY KEY NOT NULL,
    `date` text NOT NULL,
    `start_time` text DEFAULT '' NOT NULL,
    `title` text DEFAULT '' NOT NULL,
    `opponent` text DEFAULT '' NOT NULL,
    `location` text DEFAULT '' NOT NULL,
    `map_url` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `schedule_games_date_start_time_idx` ON `schedule_games` (`date`, `start_time`);
--> statement-breakpoint
CREATE TABLE `schedule_responses` (
    `schedule_id` text NOT NULL,
    `player_id` text NOT NULL,
    `status` text NOT NULL,
    `comment` text DEFAULT '' NOT NULL,
    PRIMARY KEY (`schedule_id`, `player_id`),
    FOREIGN KEY (`schedule_id`) REFERENCES `schedule_games`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
    CONSTRAINT `schedule_responses_status_check` CHECK (`schedule_responses`.`status` IN ('attending', 'absent', 'undecided'))
);
--> statement-breakpoint
ALTER TABLE `team_settings` ADD `schedule_id` text REFERENCES `schedule_games`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `team_settings` ADD `start_time` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `team_settings` ADD `location` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `team_settings` ADD `map_url` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `team_settings` ADD `schedule_week` text DEFAULT '' NOT NULL;
--> statement-breakpoint
INSERT INTO `app_revisions` (`scope`, `revision`, `write_token`) VALUES ('schedule', 0, '') ON CONFLICT (`scope`) DO NOTHING;
