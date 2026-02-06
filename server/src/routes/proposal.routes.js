import { Router } from 'express';
import {
  createProposal,
  getProposal,
  upsertSectionResponse,
  submitProposal,
  listSubmittedProposals,
  listSubmittedProposalsByTender,
  getSubmittedProposalDetail,
  setProposalStatus,
  listMyProposals,
} from '../controllers/proposal.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// BIDDER: create proposal draft for a published tender
router.post('/', requireAuth, requireRole('BIDDER'), createProposal);

// BIDDER: list own proposals
router.get('/mine', requireAuth, requireRole('BIDDER'), listMyProposals);

// BIDDER: read own; AUTHORITY: read proposals for their tenders (handled in service)
router.get('/:id', requireAuth, getProposal);

// BIDDER: upsert section response for draft proposals they own
router.put('/:id/sections/:sectionId', requireAuth, requireRole('BIDDER'), upsertSectionResponse);

// BIDDER: submit draft
router.post('/:id/submit', requireAuth, requireRole('BIDDER'), submitProposal);

// AUTHORITY: list submitted proposals for tenders they own
router.get('/', requireAuth, requireRole('AUTHORITY'), listSubmittedProposals);

// AUTHORITY: list submitted proposals for a specific tender (pagination via query: limit, offset)
router.get('/tenders/:tenderId/proposals', requireAuth, requireRole('AUTHORITY'), listSubmittedProposalsByTender);

// AUTHORITY: get submitted proposal detail (with responses)
router.get('/:id/submitted', requireAuth, requireRole('AUTHORITY'), getSubmittedProposalDetail);

// AUTHORITY: update proposal status (SUBMITTED/UNDER_REVIEW/ACCEPTED/REJECTED)
router.post('/:id/status', requireAuth, requireRole('AUTHORITY'), setProposalStatus);

export default router;
