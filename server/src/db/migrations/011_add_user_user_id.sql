BEGIN;

-- Ensure gen_random_uuid() is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Add user_id column if missing
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2) If an existing 'id' column exists, copy it into user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='user' AND column_name='id'
  ) THEN
    UPDATE "user" SET user_id = id WHERE user_id IS NULL AND id IS NOT NULL;
  END IF;
END$$;

-- 3) Fill any remaining user_id with generated UUIDs
UPDATE "user" SET user_id = gen_random_uuid() WHERE user_id IS NULL;

-- 4) Make column NOT NULL
ALTER TABLE "user" ALTER COLUMN user_id SET NOT NULL;

-- 5) Add unique constraint on user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu USING (constraint_name)
    WHERE tc.table_name='user' AND tc.constraint_type='UNIQUE' AND kcu.column_name = 'user_id'
  ) THEN
    ALTER TABLE "user" ADD CONSTRAINT users_user_id_key UNIQUE (user_id);
  END IF;
END$$;

-- 6) Add FK from proposal_audit_log.user_id -> user.user_id if both exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='proposal_audit_log') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposal_audit_log' AND column_name='user_id') THEN
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu USING (constraint_name)
        WHERE tc.table_name = 'proposal_audit_log' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'user_id'
      ) THEN
        ALTER TABLE proposal_audit_log
        ADD CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
        REFERENCES "user"(user_id) ON DELETE SET NULL;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skipping adding FK to proposal_audit_log: %', SQLERRM;
    END;
  END IF;
END$$;

COMMIT;
