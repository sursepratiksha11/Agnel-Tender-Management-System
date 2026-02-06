-- Migration: Replace REVIEWER and COMMENTER with ASSISTER role
-- ASSISTER role replaces both REVIEWER and COMMENTER
-- Permission level (EDIT vs READ_AND_COMMENT) is set during section assignment by bidder

-- Update role check constraint to use ASSISTER
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;
ALTER TABLE "user" ADD CONSTRAINT user_role_check
  CHECK (role IN ('AUTHORITY', 'BIDDER', 'ASSISTER'));

-- Update comment for documentation
COMMENT ON COLUMN "user".role IS 'User role: AUTHORITY (admin), BIDDER (company), ASSISTER (helper with specialty). Permission levels set during section assignment.';
COMMENT ON COLUMN "user".specialty IS 'Specialty for ASSISTER role (e.g., Finance, Civil Engineering, Legal). Required for assisters.';

-- Note: Existing REVIEWER or COMMENTER users will need manual data migration
-- This can be done with: UPDATE "user" SET role = 'ASSISTER' WHERE role IN ('REVIEWER', 'COMMENTER');
