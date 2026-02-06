-- Add submitted_at column and expand status values to include SUBMITTED and other statuses
ALTER TABLE proposal
  ADD COLUMN submitted_at TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Update status constraint to allow SUBMITTED and other statuses
ALTER TABLE proposal
  DROP CONSTRAINT proposal_status_check,
  ADD CONSTRAINT proposal_status_check 
    CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'));

-- Create an index on status for faster queries
CREATE INDEX idx_proposal_status ON proposal(status);

-- Create an index on organization_id for faster lookups
CREATE INDEX idx_proposal_organization ON proposal(organization_id);
