ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "deleted_by" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_deleted_at_idx" ON "expenses" USING btree ("deleted_at");
