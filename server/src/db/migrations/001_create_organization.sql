CREATE TABLE IF NOT EXISTS organization (
    organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('AUTHORITY', 'BIDDER')) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Purpose: Stores organizations participating as authorities or bidders.
-- Key constraints: Primary key on organization_id; type restricted to AUTHORITY or BIDDER.
