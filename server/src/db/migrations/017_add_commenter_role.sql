-- Migration: Add COMMENTER role for read-and-comment users
-- REVIEWER and COMMENTER are both internal roles
-- They differ only in default permission levels, not in system architecture

-- Add COMMENTER to role check constraint
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;
ALTER TABLE "user" ADD CONSTRAINT user_role_check
  CHECK (role IN ('AUTHORITY', 'BIDDER', 'REVIEWER', 'COMMENTER'));

-- Comment for documentation
COMMENT ON COLUMN "user".role IS 'User role: AUTHORITY, BIDDER, REVIEWER (internal), COMMENTER (internal). Roles define dashboard routing only.';

