-- Run migrations in order
-- Execute from server directory:
-- Get-ChildItem .\src\db\migrations\*.sql | Sort-Object Name | ForEach-Object { psql -U postgres -h localhost -p 5432 -d tms -f $_.FullName }

-- Or manually run each file:
-- psql -U postgres -h localhost -p 5432 -d tms -f ".\src\db\migrations\000_enable_extensions.sql"
-- psql -U postgres -h localhost -p 5432 -d tms -f ".\src\db\migrations\001_create_organization.sql"
-- ... and so on
-- psql -U postgres -h localhost -p 5432 -d tms -f ".\src\db\migrations\011_proposal_versioning_and_publish.sql"

-- NEW: Run the versioning and publish migration:
-- psql -U postgres -h localhost -p 5432 -d tms -f ".\src\db\migrations\011_proposal_versioning_and_publish.sql"

-- Quick verification queries after migration:

-- Check if extensions are enabled
SELECT * FROM pg_extension WHERE extname IN ('pgcrypto', 'vector');

-- List all tables
\dt

-- View organization structure
\d organization

-- View user structure
\d "user"

-- After running auth tests, verify data:

-- Check organizations created
SELECT * FROM organization;

-- Check users created
SELECT u.user_id, u.name, u.email, u.role, o.name as organization 
FROM "user" u 
JOIN organization o ON u.organization_id = o.organization_id;

-- Verify role-organization matching
SELECT u.role as user_role, o.type as org_type, u.name
FROM "user" u
JOIN organization o ON u.organization_id = o.organization_id
WHERE u.role != o.type;
-- Should return 0 rows if all is correct
