-- Apply once to the same Neon database used by the app.
-- Existing accounts get a username based on their email prefix; a short ID suffix is added only when needed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username varchar(80);

WITH bases AS (
  SELECT id,
         COALESCE(NULLIF(lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9._-]', '', 'g')), ''), 'user') AS base
  FROM users
), duplicates AS (
  SELECT base, count(*) AS total FROM bases GROUP BY base
)
UPDATE users AS u
SET username = CASE WHEN d.total > 1
  THEN b.base || '_' || substr(replace(u.id::text, '-', ''), 1, 6)
  ELSE b.base
END
FROM bases b JOIN duplicates d ON d.base = b.base
WHERE u.id = b.id AND (u.username IS NULL OR u.username = '');

-- Protect against rare sanitized-name collisions and make every existing username unique.
UPDATE users SET username = 'user_' || substr(replace(id::text, '-', ''), 1, 12)
WHERE username IN (SELECT username FROM users GROUP BY username HAVING count(*) > 1);
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx ON users (username);
