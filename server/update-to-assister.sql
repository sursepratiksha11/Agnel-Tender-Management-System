-- Update constraints to use ASSISTER role
-- Run this to update the database for the new 3-role system

-- Update user table role constraint
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;
ALTER TABLE "user" ADD CONSTRAINT user_role_check
  CHECK (role IN ('AUTHORITY', 'BIDDER', 'ASSISTER'));

-- Update organization table type constraint  
ALTER TABLE organization DROP CONSTRAINT IF EXISTS organization_type_check;
ALTER TABLE organization ADD CONSTRAINT organization_type_check
  CHECK (type IN ('AUTHORITY', 'BIDDER', 'ASSISTER'));

-- Update existing REVIEWER/COMMENTER users to ASSISTER (if any)
UPDATE "user" SET role = 'ASSISTER' WHERE role IN ('REVIEWER', 'COMMENTER');
UPDATE organization SET type = 'ASSISTER' WHERE type IN ('REVIEWER', 'COMMENTER');

SELECT 'Role constraints updated successfully!' as message;
