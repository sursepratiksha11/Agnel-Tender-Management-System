-- Migration: Add REVIEWER role and specialty field
-- Allows users to register as reviewers/commenters with specialties

-- Step 1: Add specialty column to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS specialty TEXT;

-- Step 2: Update role check constraint to include REVIEWER
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;
ALTER TABLE "user" ADD CONSTRAINT user_role_check
  CHECK (role IN ('AUTHORITY', 'BIDDER', 'REVIEWER'));

-- Step 3: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role);
CREATE INDEX IF NOT EXISTS idx_user_specialty ON "user"(specialty) WHERE specialty IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN "user".specialty IS 'Specialty for REVIEWER role (e.g., Finance, Civil Engineering, Legal)';
