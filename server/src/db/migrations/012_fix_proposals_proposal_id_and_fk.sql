BEGIN;

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Only run if 'proposals' table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals') THEN

    -- 1) Add proposal_id column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='proposal_id'
    ) THEN
      ALTER TABLE proposals ADD COLUMN proposal_id UUID;
    END IF;

    -- 2) If 'id' column exists and has values, copy them into proposal_id when proposal_id is null
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='id') THEN
      UPDATE proposals SET proposal_id = id WHERE proposal_id IS NULL AND id IS NOT NULL;
    END IF;

    -- 3) Fill remaining proposal_id with generated UUIDs
    UPDATE proposals SET proposal_id = gen_random_uuid() WHERE proposal_id IS NULL;

    -- 4) Make proposal_id NOT NULL
    ALTER TABLE proposals ALTER COLUMN proposal_id SET NOT NULL;

    -- 5) Add UNIQUE constraint on proposal_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu USING (constraint_name)
      WHERE tc.table_name='proposals' AND tc.constraint_type='UNIQUE' AND kcu.column_name='proposal_id'
    ) THEN
      ALTER TABLE proposals ADD CONSTRAINT proposals_proposal_id_key UNIQUE (proposal_id);
    END IF;

    -- 6) Add FK from proposal_audit_log.proposal_id -> proposals.proposal_id if possible
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='proposal_audit_log') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposal_audit_log' AND column_name='proposal_id') THEN
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu USING (constraint_name)
            WHERE tc.table_name = 'proposal_audit_log' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'proposal_id'
          ) THEN
            ALTER TABLE proposal_audit_log
            ADD CONSTRAINT fk_audit_proposal FOREIGN KEY (proposal_id)
            REFERENCES proposals(proposal_id) ON DELETE CASCADE;
          END IF;
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'Skipping adding FK from proposal_audit_log: %', SQLERRM;
        END;
      END IF;
    END IF;

  END IF;
END$$;

COMMIT;