-- Quick fix: Add missing columns to tender and tender_section tables
-- Run this with: psql -U postgres -d tenderflow_db -f quick-fix-schema.sql

-- Add columns to tender table
DO $$ 
BEGIN
    -- Add authority_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tender' AND column_name='authority_name') THEN
        ALTER TABLE tender ADD COLUMN authority_name VARCHAR(255);
    END IF;
    
    -- Add reference_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tender' AND column_name='reference_id') THEN
        ALTER TABLE tender ADD COLUMN reference_id VARCHAR(100);
        CREATE INDEX idx_tender_reference_id ON tender(reference_id);
    END IF;
    
    -- Add tender_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tender' AND column_name='tender_type') THEN
        ALTER TABLE tender ADD COLUMN tender_type VARCHAR(100);
    END IF;
    
    -- Add sector if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tender' AND column_name='sector') THEN
        ALTER TABLE tender ADD COLUMN sector VARCHAR(100);
    END IF;
    
    -- Add estimated_value if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tender' AND column_name='estimated_value') THEN
        ALTER TABLE tender ADD COLUMN estimated_value DECIMAL(15, 2);
    END IF;
    
    -- Add submission_start_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tender' AND column_name='submission_start_date') THEN
        ALTER TABLE tender ADD COLUMN submission_start_date TIMESTAMP;
    END IF;
    
    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tender' AND column_name='updated_at') THEN
        ALTER TABLE tender ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
    
    -- Add content to tender_section if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tender_section' AND column_name='content') THEN
        ALTER TABLE tender_section ADD COLUMN content TEXT;
    END IF;
    
    -- Add section_key to tender_section if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tender_section' AND column_name='section_key') THEN
        ALTER TABLE tender_section ADD COLUMN section_key VARCHAR(100);
        CREATE INDEX idx_section_key ON tender_section(section_key);
    END IF;
    
    -- Add description to tender_section if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tender_section' AND column_name='description') THEN
        ALTER TABLE tender_section ADD COLUMN description TEXT;
    END IF;
    
    -- Add updated_at to tender_section if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tender_section' AND column_name='updated_at') THEN
        ALTER TABLE tender_section ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Verify the schema
SELECT 'Tender table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tender'
ORDER BY ordinal_position;

SELECT 'Tender_section table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tender_section'
ORDER BY ordinal_position;
