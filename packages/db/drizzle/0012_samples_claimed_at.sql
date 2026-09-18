ALTER TABLE "user" ADD COLUMN "samples_claimed_at" timestamp;--> statement-breakpoint
-- The samples are for accounts that sign up from here on. Every account that
-- already exists is marked as done with them, so an existing user whose
-- desktop workspace happens to be empty (a new machine, a first install) is
-- not handed three projects they did not ask for.
UPDATE "user" SET "samples_claimed_at" = now();
