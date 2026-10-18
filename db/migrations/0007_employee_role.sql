-- Add a read-only Employee role for account management.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'employee';
