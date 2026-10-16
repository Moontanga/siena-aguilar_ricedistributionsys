ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_fee numeric(14,2) NOT NULL DEFAULT '0';
--> statement-breakpoint
ALTER TABLE sales ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
--> statement-breakpoint
ALTER TABLE sales ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id);
--> statement-breakpoint
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
--> statement-breakpoint
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sales_deleted_at_idx ON sales(deleted_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS purchases_deleted_at_idx ON purchases(deleted_at);
