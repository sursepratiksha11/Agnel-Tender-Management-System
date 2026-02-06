CREATE TABLE IF NOT EXISTS proposal_section_response (
    response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposal(proposal_id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES tender_section(section_id),
    content TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (proposal_id, section_id)
);

-- Purpose: Stores responses to individual tender sections within a proposal.
-- Key constraints: Primary key on response_id; foreign keys to proposal (cascade delete) and tender_section; unique proposal_id + section_id.
