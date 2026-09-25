CREATE TABLE "export_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"plan" text NOT NULL,
	"format" text,
	"total_frames" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "export_events" ADD CONSTRAINT "export_events_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_events" ADD CONSTRAINT "export_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "export_events_org_created_idx" ON "export_events" USING btree ("organization_id","created_at");--> statement-breakpoint
-- The GenMotion badge is gone: a free export is now byte-for-byte what a paid
-- one would have been, so there is no per-job policy left to freeze. Dropped
-- rather than kept as a dead `false`, since nothing reads it and a column that
-- always holds one value invites someone to start branching on it again.
ALTER TABLE "export_jobs" DROP COLUMN "watermark";