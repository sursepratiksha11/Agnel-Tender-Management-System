-- Migration: Create uploaded_tender table
-- Purpose: Store PDF tenders uploaded by bidders for discovery and analysis

CREATE TABLE IF NOT EXISTS uploaded_tender (
    uploaded_tender_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,

    -- Tender identification
    title TEXT NOT NULL,
    description TEXT,

    -- Source information
    source TEXT CHECK (source IN ('PDF_UPLOAD', 'URL')) DEFAULT 'PDF_UPLOAD',
    source_url TEXT,
    original_filename TEXT,
    file_size INTEGER,

    -- Parsed and analyzed data stored as JSONB
    parsed_data JSONB,       -- Output from PDFParserService
    analysis_data JSONB,     -- Output from PDFAnalysisService (summary + proposal draft)

    -- Tender metadata (extracted from analysis)
    authority_name TEXT,
    reference_number TEXT,
    sector TEXT,
    estimated_value DECIMAL(15, 2),
    submission_deadline TIMESTAMP,
    emd_amount DECIMAL(15, 2),

    -- Statistics
    word_count INTEGER DEFAULT 0,
    section_count INTEGER DEFAULT 0,
    opportunity_score INTEGER DEFAULT 0,

    -- Status tracking
    status TEXT CHECK (status IN ('ANALYZING', 'ANALYZED', 'FAILED')) DEFAULT 'ANALYZING',
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    analyzed_at TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_uploaded_tender_organization ON uploaded_tender(organization_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_tender_user ON uploaded_tender(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_tender_status ON uploaded_tender(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_tender_created ON uploaded_tender(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_tender_deadline ON uploaded_tender(submission_deadline);

-- Comment on table
COMMENT ON TABLE uploaded_tender IS 'Stores PDF tender documents uploaded by bidders, including parsed content and AI analysis';
