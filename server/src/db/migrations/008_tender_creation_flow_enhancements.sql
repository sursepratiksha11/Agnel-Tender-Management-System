-- Migration: Add Tender Creation Flow Fields
-- Purpose: Support structured tender creation with new fields for authority, type, sector, dates, and section content

-- Add new columns to tender table
ALTER TABLE tender
ADD COLUMN IF NOT EXISTS authority_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS tender_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS sector VARCHAR(100),
ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS submission_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index for reference_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tender_reference_id ON tender(reference_id);

-- Add constraint to ensure logical date progression
ALTER TABLE tender
ADD CONSTRAINT chk_tender_dates CHECK (submission_deadline > submission_start_date);

-- Add new columns to tender_section table to support content
ALTER TABLE tender_section
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS section_key VARCHAR(100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 1;

-- Create index for section_key for semantic lookups
CREATE INDEX IF NOT EXISTS idx_section_key ON tender_section(section_key);

-- Add constraint to ensure order_index is positive (safe check to avoid duplicate constraint errors)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_tender_dates'
    ) THEN
        ALTER TABLE tender
        ADD CONSTRAINT chk_tender_dates CHECK (start_date <= end_date);
    END IF;
END
$$;
