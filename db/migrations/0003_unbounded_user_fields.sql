-- Remove application-level character limits for account name, username, and email.
-- Run once in the same Neon database used by this application.
ALTER TABLE users ALTER COLUMN name TYPE text;
ALTER TABLE users ALTER COLUMN username TYPE text;
ALTER TABLE users ALTER COLUMN email TYPE text;
