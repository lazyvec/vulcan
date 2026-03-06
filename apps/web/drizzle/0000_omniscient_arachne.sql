CREATE TABLE IF NOT EXISTS `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role_tags` text DEFAULT '[]' NOT NULL,
	`mission` text NOT NULL,
	`avatar_key` text DEFAULT 'seed' NOT NULL,
	`status` text NOT NULL,
	`status_since` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `docs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`format` text DEFAULT 'markdown' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `events` (
	`id` text PRIMARY KEY NOT NULL,
	`ts` integer NOT NULL,
	`source` text DEFAULT 'openclaw' NOT NULL,
	`agent_id` text,
	`project_id` text,
	`task_id` text,
	`type` text NOT NULL,
	`summary` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_events_ts` ON `events` (`ts`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `memory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`container` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`source_ref` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`priority` text NOT NULL,
	`owner_agent_id` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_projects_updated` ON `projects` (`updated_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cron_or_interval` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`last_run_at` integer,
	`next_run_at` integer,
	`owner_agent_id` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`title` text NOT NULL,
	`assignee_agent_id` text,
	`lane` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_tasks_lane` ON `tasks` (`lane`);
