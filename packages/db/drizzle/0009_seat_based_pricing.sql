-- Team is gone: one paid plan, priced per person, with extra seats as an
-- add-on. Any org still recorded as `team` becomes `pro` and keeps the seat
-- count it already had, so nothing loses access on deploy.
UPDATE "organization_subscriptions" SET "plan" = 'pro' WHERE "plan" = 'team';
