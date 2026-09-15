ALTER TABLE "plugin_calls" ADD COLUMN "units" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "plugin_calls" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "plugin_calls" ADD COLUMN "cost_usd_micros" integer DEFAULT 0 NOT NULL;