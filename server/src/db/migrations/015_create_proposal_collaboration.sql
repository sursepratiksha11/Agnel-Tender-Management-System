-- Migration: Add collaboration features to proposal drafting
-- Supports: section assignments, comments, activity tracking

-- ============================================
-- 1. PROPOSAL COLLABORATOR - Section Assignments
-- ============================================
CREATE TABLE IF NOT EXISTS proposal_collaborator (
    collaborator_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposal(proposal_id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES tender_section(section_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    permission TEXT NOT NULL CHECK (permission IN ('EDIT', 'READ_AND_COMMENT')),
    assigned_by UUID NOT NULL REFERENCES "user"(user_id),
    assigned_at TIMESTAMP DEFAULT NOW(),

    -- Ensure unique assignment per user per section per proposal
    UNIQUE (proposal_id, section_id, user_id)
);

-- Indexes for efficient permission lookups
CREATE INDEX IF NOT EXISTS idx_collaborator_proposal ON proposal_collaborator(proposal_id);
CREATE INDEX IF NOT EXISTS idx_collaborator_user ON proposal_collaborator(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborator_section ON proposal_collaborator(section_id);
CREATE INDEX IF NOT EXISTS idx_collaborator_lookup ON proposal_collaborator(proposal_id, user_id);

-- ============================================
-- 2. PROPOSAL COMMENT - Threaded Comments
-- ============================================
CREATE TABLE IF NOT EXISTS proposal_comment (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposal(proposal_id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES tender_section(section_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,

    -- Comment content
    content TEXT NOT NULL,

    -- Thread support (parent_comment_id NULL = root comment)
    parent_comment_id UUID REFERENCES proposal_comment(comment_id) ON DELETE CASCADE,

    -- Inline comment position (optional)
    selection_start INTEGER,
    selection_end INTEGER,
    quoted_text TEXT,

    -- Status tracking
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES "user"(user_id),
    resolved_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_comment_proposal ON proposal_comment(proposal_id);
CREATE INDEX IF NOT EXISTS idx_comment_section ON proposal_comment(proposal_id, section_id);
CREATE INDEX IF NOT EXISTS idx_comment_thread ON proposal_comment(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_user ON proposal_comment(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_unresolved ON proposal_comment(proposal_id, is_resolved) WHERE is_resolved = false;

-- ============================================
-- 3. PROPOSAL SECTION ACTIVITY - Activity Log
-- ============================================
CREATE TABLE IF NOT EXISTS proposal_section_activity (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposal(proposal_id) ON DELETE CASCADE,
    section_id UUID REFERENCES tender_section(section_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,

    -- Activity type
    activity_type TEXT NOT NULL CHECK (activity_type IN ('EDIT', 'AI_DRAFT', 'COMMENT', 'RESOLVE_COMMENT', 'ASSIGN', 'UNASSIGN')),

    -- Additional metadata (word count change, AI model, etc.)
    metadata JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for activity
CREATE INDEX IF NOT EXISTS idx_activity_proposal ON proposal_section_activity(proposal_id);
CREATE INDEX IF NOT EXISTS idx_activity_section ON proposal_section_activity(proposal_id, section_id);
CREATE INDEX IF NOT EXISTS idx_activity_recent ON proposal_section_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON proposal_section_activity(user_id);

-- ============================================
-- 4. MODIFY EXISTING TABLES
-- ============================================

-- Add last_edited_by to proposal_section_response
ALTER TABLE proposal_section_response
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES "user"(user_id);

-- Add comment_count cache to proposal_section_response
ALTER TABLE proposal_section_response
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- ============================================
-- 5. UPLOADED TENDER COLLABORATION SUPPORT
-- ============================================
-- For uploaded tenders, we need similar collaboration tables
-- Using nullable FKs to support both platform and uploaded tenders

CREATE TABLE IF NOT EXISTS uploaded_proposal_collaborator (
    collaborator_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_tender_id UUID NOT NULL REFERENCES uploaded_tender(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,  -- e.g., 'coverLetter', 'technicalApproach', etc.
    user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    permission TEXT NOT NULL CHECK (permission IN ('EDIT', 'READ_AND_COMMENT')),
    assigned_by UUID NOT NULL REFERENCES "user"(user_id),
    assigned_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (uploaded_tender_id, section_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_uploaded_collaborator_tender ON uploaded_proposal_collaborator(uploaded_tender_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_collaborator_user ON uploaded_proposal_collaborator(user_id);

CREATE TABLE IF NOT EXISTS uploaded_proposal_comment (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_tender_id UUID NOT NULL REFERENCES uploaded_tender(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES uploaded_proposal_comment(comment_id) ON DELETE CASCADE,
    quoted_text TEXT,

    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES "user"(user_id),
    resolved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_comment_tender ON uploaded_proposal_comment(uploaded_tender_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_comment_section ON uploaded_proposal_comment(uploaded_tender_id, section_key);

-- ============================================
-- PURPOSE SUMMARY
-- ============================================
-- proposal_collaborator: Section-level user assignments for platform tenders
-- proposal_comment: Threaded comments on proposal sections
-- proposal_section_activity: Activity log for all proposal changes
-- uploaded_proposal_collaborator: Section assignments for uploaded tender proposals
-- uploaded_proposal_comment: Comments for uploaded tender proposals
--
-- Permission types:
-- - EDIT: Can modify section content and use AI drafting
-- - READ_AND_COMMENT: Can only view and add comments
