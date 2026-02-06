CREATE TABLE IF NOT EXISTS tender (
    tender_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(organization_id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT CHECK (status IN ('DRAFT', 'PUBLISHED')) DEFAULT 'DRAFT',
    submission_deadline TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Purpose: Represents tenders created by organizations.
-- Key constraints: Primary key on tender_id; foreign key to organization; status limited to DRAFT or PUBLISHED.
