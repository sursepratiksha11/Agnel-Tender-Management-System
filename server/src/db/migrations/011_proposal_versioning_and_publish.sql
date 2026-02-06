-- Migration: Add versioning and publish workflow support to proposals
-- This migration adds support for:
-- 1. Extended status workflow (DRAFT -> FINAL -> PUBLISHED)
-- 2. Version tracking for proposals

-- Step 1: Update proposal status constraint to include FINAL and PUBLISHED
ALTER TABLE proposal DROP CONSTRAINT IF EXISTS proposal_status_check;
ALTER TABLE proposal ADD CONSTRAINT proposal_status_check
  CHECK (status IN ('DRAFT', 'FINAL', 'PUBLISHED', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'));

-- Step 2: Add version-related columns to proposal table
ALTER TABLE proposal ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE proposal ADD COLUMN IF NOT EXISTS parent_proposal_id UUID REFERENCES proposal(proposal_id);
ALTER TABLE proposal ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP;
ALTER TABLE proposal ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- Step 3: Create proposal_version table for version history snapshots
CREATE TABLE IF NOT EXISTS proposal_version (
    version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposal(proposal_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    status TEXT NOT NULL,
    snapshot_data JSONB NOT NULL, -- Stores section responses at time of version creation
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES "user"(user_id),
    notes TEXT,
    UNIQUE(proposal_id, version_number)
);

-- Step 4: Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_proposal_version ON proposal(version);
CREATE INDEX IF NOT EXISTS idx_proposal_parent ON proposal(parent_proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_version_proposal ON proposal_version(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_version_number ON proposal_version(proposal_id, version_number);

-- Purpose: Adds versioning and extended publish workflow to proposals
-- Key changes:
-- 1. proposal.status now supports: DRAFT, FINAL, PUBLISHED, SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED
-- 2. proposal.version tracks the version number
-- 3. proposal.parent_proposal_id links to the original proposal for version chains
-- 4. proposal_version table stores snapshots of each version
