CREATE TABLE IF NOT EXISTS proposal (
    proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tender(tender_id),
    organization_id UUID NOT NULL REFERENCES organization(organization_id),
    status TEXT CHECK (status IN ('DRAFT')) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (tender_id, organization_id)
);

-- Purpose: Captures proposals submitted by organizations for specific tenders.
-- Key constraints: Primary key on proposal_id; foreign keys to tender and organization; unique tender_id + organization_id; status restricted to DRAFT.
