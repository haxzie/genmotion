ALTER TABLE "export_jobs" ALTER COLUMN "quality" SET DEFAULT 95;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD COLUMN "format" text DEFAULT 'mp4' NOT NULL;