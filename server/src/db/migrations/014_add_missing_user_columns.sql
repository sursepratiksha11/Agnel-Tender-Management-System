BEGIN;

-- Ensure gen_random_uuid() is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add user_id column (app-level UUID) and populate from existing id
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS user_id UUID;
UPDATE "user"
SET user_id = id
WHERE user_id IS NULL AND id IS NOT NULL;
ALTER TABLE "user"
ALTER COLUMN user_id SET DEFAULT gen_random_uuid();

-- Ensure name column exists (already exists in base schema, but keep safe)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS name TEXT;

-- Ensure password_hash column exists
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Ensure organization_id column exists
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS organization_id UUID
REFERENCES organization(organization_id);

-- Ensure specialty column exists (for ASSISTER role)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS specialty TEXT;

-- Add unique constraint on user_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'user'
      AND tc.constraint_type = 'UNIQUE'
      AND kcu.column_name = 'user_id'
  ) THEN
    ALTER TABLE "user"
    ADD CONSTRAINT users_user_id_key UNIQUE (user_id);
  END IF;
END$$;

COMMIT;
