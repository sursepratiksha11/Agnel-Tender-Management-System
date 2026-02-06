-- Migration: Add unique constraint to prevent duplicate uploaded tenders
-- This ensures the same tender title cannot be uploaded twice by the same user

-- Create unique index on user_id + title combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_uploaded_tender_user_title 
ON uploaded_tender(user_id, title);

-- Note: This will prevent duplicate uploads at the database level
-- The application layer also checks for duplicates and updates existing records
