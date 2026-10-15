-- Apply once in the Neon SQL Editor against the database used by Vercel.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name varchar(180);
