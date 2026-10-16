ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_fee numeric(14,2) NOT NULL DEFAULT '0';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id);
CREATE INDEX IF NOT EXISTS sales_deleted_at_idx ON sales(deleted_at);
CREATE INDEX IF NOT EXISTS purchases_deleted_at_idx ON purchases(deleted_at);
