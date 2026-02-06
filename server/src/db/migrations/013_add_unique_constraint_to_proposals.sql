DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='proposal'
      AND constraint_type='UNIQUE'
      AND constraint_name='proposal_proposal_id_key'
  ) THEN
    ALTER TABLE proposal
      ADD CONSTRAINT proposal_proposal_id_key UNIQUE (proposal_id);
  END IF;
END $$;

COMMIT;
