-- Migration: Create saved_tender table
-- Purpose: Persist saved/bookmarked tenders for bidders (both platform and uploaded tenders)

CREATE TABLE IF NOT EXISTS saved_tender (
    saved_tender_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE CASCADE,

    -- Reference to either platform tender or uploaded tender (one must be set)
    tender_id UUID REFERENCES tender(tender_id) ON DELETE CASCADE,
    uploaded_tender_id UUID REFERENCES uploaded_tender(uploaded_tender_id) ON DELETE CASCADE,

    -- Timestamps
    saved_at TIMESTAMP DEFAULT NOW(),

    -- Ensure at least one tender reference is set
    CONSTRAINT check_tender_reference CHECK (
        (tender_id IS NOT NULL AND uploaded_tender_id IS NULL) OR
        (tender_id IS NULL AND uploaded_tender_id IS NOT NULL)
    ),

    -- Unique constraints to prevent duplicate saves
    CONSTRAINT unique_user_tender UNIQUE (user_id, tender_id),
    CONSTRAINT unique_user_uploaded_tender UNIQUE (user_id, uploaded_tender_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_saved_tender_user ON saved_tender(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_tender_organization ON saved_tender(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_tender_tender ON saved_tender(tender_id) WHERE tender_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_saved_tender_uploaded ON saved_tender(uploaded_tender_id) WHERE uploaded_tender_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_saved_tender_saved_at ON saved_tender(saved_at DESC);

-- Comment on table
COMMENT ON TABLE saved_tender IS 'Stores bookmarked/saved tenders for bidders, supporting both platform and uploaded tenders';
