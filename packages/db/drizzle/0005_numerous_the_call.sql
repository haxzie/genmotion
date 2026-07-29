CREATE TABLE "billing_checkout_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"plan" text NOT NULL,
	"product_id" text NOT NULL,
	"checkout_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"organization_id" text,
	"dodo_subscription_id" text,
	"event_at" timestamp,
	"payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"detail" text,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'none' NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"dodo_customer_id" text,
	"dodo_subscription_id" text,
	"dodo_product_id" text,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"last_event_at" timestamp,
	"last_webhook_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_checkout_sessions_org_idx" ON "billing_checkout_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_received_idx" ON "billing_webhook_events" USING btree ("received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "org_subscriptions_org_idx" ON "organization_subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_subscriptions_dodo_sub_idx" ON "organization_subscriptions" USING btree ("dodo_subscription_id");