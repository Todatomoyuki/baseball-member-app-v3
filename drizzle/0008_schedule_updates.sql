-- Run once after 0007_schedules.sql, before deploying the updated app and worker.
-- Existing responses remain confirmed for the initial details revision.
ALTER TABLE `schedule_games` ADD `status` text DEFAULT 'unconfirmed' NOT NULL
    CONSTRAINT `schedule_games_status_check` CHECK (`status` IN ('unconfirmed', 'proposed', 'confirmed'));
--> statement-breakpoint
ALTER TABLE `schedule_games` ADD `details_revision` integer DEFAULT 1 NOT NULL
    CONSTRAINT `schedule_games_details_revision_check` CHECK (`details_revision` >= 1);
--> statement-breakpoint
ALTER TABLE `schedule_responses` ADD `confirmed_revision` integer DEFAULT 1 NOT NULL
    CONSTRAINT `schedule_responses_confirmed_revision_check` CHECK (`confirmed_revision` >= 0);
--> statement-breakpoint
CREATE INDEX `schedule_games_date_id_idx` ON `schedule_games` (`date`, `id`);
