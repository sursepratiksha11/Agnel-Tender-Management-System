CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('AUTHORITY', 'BIDDER')) NOT NULL,
    organization_id UUID REFERENCES organization(organization_id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Purpose: Stores users linked to organizations with roles for tender operations.
-- Key constraints: Primary key on user_id; unique email; role restricted to AUTHORITY or BIDDER; foreign key to organization.
