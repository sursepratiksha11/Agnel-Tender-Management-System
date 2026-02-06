CREATE TABLE IF NOT EXISTS tender_content_chunk (
    chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tender(tender_id) ON DELETE CASCADE,
    section_id UUID REFERENCES tender_section(section_id),
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Purpose: Stores AI-ready content chunks for tenders with optional section linkage and embeddings.
-- Key constraints: Primary key on chunk_id; foreign keys to tender (cascade delete) and tender_section; embedding uses VECTOR(1536).
