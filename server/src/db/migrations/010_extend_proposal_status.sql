-- Migration 010: Expand Proposal Status Values
-- Purpose: Update the proposal table status CHECK constraint to include all required statuses:
-- DRAFT (initial state), SUBMITTED (bidder submitted), UNDER_REVIEW (authority reviewing),
-- ACCEPTED (authority approved), REJECTED (authority declined)

-- Drop the old constraint
ALTER TABLE proposal DROP CONSTRAINT proposal_status_check;

-- Add new constraint with all statuses
ALTER TABLE proposal ADD CONSTRAINT proposal_status_check 
    CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'));

-- Add updated_at column for tracking status changes
ALTER TABLE proposal ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Comment for clarity
COMMENT ON TABLE proposal IS 'Proposals submitted by bidders for tenders. Status flow: DRAFT → SUBMITTED → UNDER_REVIEW → (ACCEPTED or REJECTED)';
