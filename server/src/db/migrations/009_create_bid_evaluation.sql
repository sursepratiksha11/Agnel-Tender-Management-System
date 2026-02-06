-- Bid Evaluation Module
-- Tracks evaluation status and details for each bid (proposal)

CREATE TABLE IF NOT EXISTS bid_evaluation (
    evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tender(tender_id) ON DELETE CASCADE,
    proposal_id UUID NOT NULL REFERENCES proposal(proposal_id) ON DELETE CASCADE,
    organization_name VARCHAR(255),
    bid_amount DECIMAL(15, 2),
    technical_status VARCHAR(50) DEFAULT 'PENDING' CHECK (technical_status IN ('PENDING', 'QUALIFIED', 'DISQUALIFIED')),
    technical_score DECIMAL(5, 2),
    remarks TEXT,
    evaluator_user_id UUID REFERENCES "user"(id),
    evaluated_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (proposal_id)
);

-- Tender Evaluation Status
-- Tracks overall evaluation state for a tender

CREATE TABLE IF NOT EXISTS tender_evaluation_status (
    evaluation_status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL UNIQUE REFERENCES tender(tender_id) ON DELETE CASCADE,
    evaluation_status VARCHAR(50) DEFAULT 'PENDING' CHECK (evaluation_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    total_bids_received INT DEFAULT 0,
    bids_qualified INT DEFAULT 0,
    bids_disqualified INT DEFAULT 0,
    l1_proposal_id UUID REFERENCES proposal(proposal_id),
    l1_amount DECIMAL(15, 2),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bid_evaluation_tender_id ON bid_evaluation(tender_id);
CREATE INDEX IF NOT EXISTS idx_bid_evaluation_proposal_id ON bid_evaluation(proposal_id);
CREATE INDEX IF NOT EXISTS idx_bid_evaluation_technical_status ON bid_evaluation(technical_status);
CREATE INDEX IF NOT EXISTS idx_tender_evaluation_status_tender_id ON tender_evaluation_status(tender_id);
