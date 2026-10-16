-- Run once in the Neon SQL Editor for the exact database used by Vercel.
-- This consolidates the account-related schema fixes and is safe to re-run.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE users ALTER COLUMN name TYPE text;
ALTER TABLE users ALTER COLUMN email TYPE text;
ALTER TABLE users ALTER COLUMN username TYPE text;

-- Fill missing usernames for existing accounts with a stable suffix to avoid collisions.
WITH bases AS (
  SELECT id,
         COALESCE(NULLIF(lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9._-]', '', 'g')), ''), 'user') AS base
  FROM users
  WHERE username IS NULL OR btrim(username) = ''
)
UPDATE users AS u
SET username = bases.base || '_' || substr(replace(u.id::text, '-', ''), 1, 8)
FROM bases
WHERE bases.id = u.id;

-- Resolve duplicate usernames case-insensitively while preserving the first one.
WITH ranked AS (
  SELECT id, username,
         row_number() OVER (PARTITION BY lower(username) ORDER BY created_at, id) AS rn
  FROM users
)
UPDATE users AS u
SET username = lower(ranked.username) || '_' || substr(replace(u.id::text, '-', ''), 1, 8)
FROM ranked
WHERE ranked.id = u.id AND ranked.rn > 1;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique_idx ON users (lower(username));
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name varchar(180);
