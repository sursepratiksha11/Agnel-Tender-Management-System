import { ProposalService } from '../services/proposal.service.js';

// BIDDER: create draft
export async function createProposal(req, res, next) {
  try {
    const { tenderId } = req.body;
    if (!tenderId) {
      return res.status(400).json({ error: 'tenderId is required' });
    }

    const proposal = await ProposalService.createProposalDraft(tenderId, req.user);
    res.status(201).json(proposal);
  } catch (err) {
    if (err.message === 'Tender not found') return res.status(404).json({ error: err.message });
    if (err.message.includes('non-published')) return res.status(403).json({ error: err.message });
    if (err.message.includes('already exists')) return res.status(400).json({ error: err.message });
    next(err);
  }
}

// BIDDER: read own draft; AUTHORITY: read proposals for tenders they own
export async function getProposal(req, res, next) {
  try {
    const { id } = req.params;
    const proposal = await ProposalService.getProposal(id, req.user);
    res.json(proposal);
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    next(err);
  }
}

// BIDDER: upsert section response (draft only)
export async function upsertSectionResponse(req, res, next) {
  try {
    const { id, sectionId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }

    const response = await ProposalService.upsertSectionResponse(id, sectionId, content, req.user);
    res.json(response);
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Section does not belong to this tender') return res.status(400).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    if (err.message === 'Cannot edit a non-draft proposal') return res.status(403).json({ error: err.message });
    next(err);
  }
}

// BIDDER: submit draft → SUBMITTED (with full validation)
export async function submitProposal(req, res, next) {
  try {
    const { id } = req.params;
    const proposal = await ProposalService.submitProposal(id, req.user);
    res.json({ data: { proposal } });
  } catch (err) {
    // Validation errors return 400 with details
    if (err.message === 'Proposal incomplete') {
      return res.status(400).json({
        error: err.message,
        details: err.details,
        incompleteSections: err.incompleteSections || [],
        incompleteIds: err.incompleteIds || []
      });
    }
    
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    if (err.message === 'Proposal already submitted') return res.status(400).json({ error: err.message, details: err.details });
    
    next(err);
  }
}

// AUTHORITY: list submitted proposals for tenders they own
export async function listSubmittedProposals(req, res, next) {
  try {
    const proposals = await ProposalService.listSubmittedForAuthority(req.user);
    res.json({ proposals });
  } catch (err) {
    next(err);
  }
}

// BIDDER: list own proposals
export async function listMyProposals(req, res, next) {
  try {
    const proposals = await ProposalService.listForBidder(req.user);
    res.json({ proposals });
  } catch (err) {
    next(err);
  }
}

// AUTHORITY: list submitted proposals for specific tender (with pagination)
export async function listSubmittedProposalsByTender(req, res, next) {
  try {
    const { tenderId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    const proposals = await ProposalService.listSubmittedForTender(tenderId, req.user, {
      limit,
      offset,
    });

    res.json({ proposals, pagination: { limit, offset } });
  } catch (err) {
    if (err.message === 'Tender not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    next(err);
  }
}

// AUTHORITY: get submitted proposal detail with section responses
export async function getSubmittedProposalDetail(req, res, next) {
  try {
    const { id } = req.params;
    const proposal = await ProposalService.getProposalForAuthority(id, req.user);
    res.json(proposal);
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    if (err.message === 'Proposal is not submitted') return res.status(400).json({ error: err.message });
    next(err);
  }
}

// AUTHORITY: update proposal status (SUBMITTED/UNDER_REVIEW/ACCEPTED/REJECTED)
export async function setProposalStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'status is required' });

    const updated = await ProposalService.setProposalStatus(id, status, req.user);
    res.json(updated);
  } catch (err) {
    if (err.message === 'Proposal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    if (err.message === 'Invalid status') return res.status(400).json({ error: err.message });
    if (err.message === 'Status transition not allowed') return res.status(400).json({ error: err.message });
    next(err);
  }
}
