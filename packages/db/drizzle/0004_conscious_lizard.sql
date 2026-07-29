ALTER TABLE "chat_messages" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "total_tokens" integer;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "cache_read_tokens" integer;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "cache_write_tokens" integer;