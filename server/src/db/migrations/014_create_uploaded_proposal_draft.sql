-- Migration: Create uploaded_proposal_draft table
-- Purpose: Store proposal drafts created from uploaded PDF tenders

CREATE TABLE IF NOT EXISTS uploaded_proposal_draft (
    draft_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_tender_id UUID NOT NULL REFERENCES uploaded_tender(uploaded_tender_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE CASCADE,

    -- Draft content stored as JSONB (array of sections)
    sections JSONB NOT NULL DEFAULT '[]',

    -- Status tracking
    status TEXT CHECK (status IN ('DRAFT', 'FINAL', 'EXPORTED')) DEFAULT 'DRAFT',

    -- Metadata
    title TEXT,
    total_sections INTEGER DEFAULT 0,
    total_words INTEGER DEFAULT 0,
    completion_percent INTEGER DEFAULT 0,

    -- Export tracking
    last_exported_at TIMESTAMP,
    export_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- One draft per user per uploaded tender
    CONSTRAINT unique_user_uploaded_tender_draft UNIQUE (user_id, uploaded_tender_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_uploaded_proposal_draft_user ON uploaded_proposal_draft(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_proposal_draft_org ON uploaded_proposal_draft(organization_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_proposal_draft_tender ON uploaded_proposal_draft(uploaded_tender_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_proposal_draft_status ON uploaded_proposal_draft(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_proposal_draft_updated ON uploaded_proposal_draft(updated_at DESC);

-- Comment on table
COMMENT ON TABLE uploaded_proposal_draft IS 'Stores proposal drafts created from PDF analysis of uploaded tenders';
