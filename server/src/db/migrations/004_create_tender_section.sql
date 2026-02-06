CREATE TABLE IF NOT EXISTS tender_section (
    section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tender(tender_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    is_mandatory BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Purpose: Defines structured sections within a tender.
-- Key constraints: Primary key on section_id; foreign key to tender with cascade delete; order_index required.
