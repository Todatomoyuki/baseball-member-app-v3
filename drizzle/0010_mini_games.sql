CREATE TABLE `mini_game_runs` (
	`game_id` text NOT NULL,
	`player_id` text NOT NULL,
	`run_id` text NOT NULL,
	`turn` integer DEFAULT 0 NOT NULL,
	`balance` integer NOT NULL,
	`status` text NOT NULL,
	`last_request_id` text NOT NULL,
	`result_json` text DEFAULT 'null' NOT NULL,
	`started_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`game_id`, `player_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "mini_game_runs_turn_check" CHECK("mini_game_runs"."turn" >= 0),
	CONSTRAINT "mini_game_runs_balance_check" CHECK("mini_game_runs"."balance" >= 0),
	CONSTRAINT "mini_game_runs_status_check" CHECK("mini_game_runs"."status" IN ('playing', 'finished'))
);
--> statement-breakpoint
CREATE TABLE `mini_game_scores` (
	`game_id` text NOT NULL,
	`player_id` text NOT NULL,
	`score` integer NOT NULL,
	`achieved_at` integer NOT NULL,
	PRIMARY KEY(`game_id`, `player_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "mini_game_scores_score_check" CHECK("mini_game_scores"."score" >= 0)
);
--> statement-breakpoint
CREATE INDEX `mini_game_scores_ranking_idx` ON `mini_game_scores` (`game_id`,"score" DESC,"achieved_at" ASC,"player_id" ASC);