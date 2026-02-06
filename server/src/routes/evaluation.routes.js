import { Router } from 'express';
import {
  getTendersForEvaluation,
  getBidsForTender,
  initializeTenderEvaluation,
  updateBidEvaluation,
  completeEvaluation,
  getTenderEvaluationDetails
} from '../controllers/evaluation.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// All routes require AUTHORITY role
router.use(requireAuth, requireRole('AUTHORITY'));

// Get list of tenders ready for evaluation
router.get('/tenders', getTendersForEvaluation);

// Get bids for a specific tender
router.get('/tenders/:tenderId/bids', getBidsForTender);

// Initialize evaluation for a tender
router.post('/tenders/:tenderId/initialize', initializeTenderEvaluation);

// Get evaluation details for a tender
router.get('/tenders/:tenderId/details', getTenderEvaluationDetails);

// Update bid evaluation
router.put('/bids/:proposalId', updateBidEvaluation);

// Complete evaluation for a tender
router.post('/tenders/:tenderId/complete', completeEvaluation);

export default router;
