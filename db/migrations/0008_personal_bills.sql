-- Personal bills are private to each signed-in account and never feed business reports.
CREATE TABLE IF NOT EXISTS personal_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(180) NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  billing_type varchar(16) NOT NULL CHECK (billing_type IN ('single','renewal')),
  frequency varchar(16) CHECK (frequency IN ('weekly','monthly','quarterly','yearly')),
  next_due_date date,
  interval_days integer,
  notes text,
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','paid')),
  last_paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((billing_type = 'single' AND frequency IS NULL) OR (billing_type = 'renewal' AND frequency IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS personal_bills_user_due_idx ON personal_bills(user_id, next_due_date);
