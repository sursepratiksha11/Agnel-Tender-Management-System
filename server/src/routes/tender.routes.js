import { Router } from 'express';
import {
  listTenders,
  createTender,
  updateTender,
  getTender,
  publishTender,
  deleteTender,
  addSection,
  updateSection,
  deleteSection,
  reorderSections,
} from '../controllers/tender.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// List tenders (role-based: AUTHORITY = org tenders, BIDDER = published)
router.get('/', requireAuth, listTenders);

// Tender CRUD
router.post('/', requireAuth, requireRole('AUTHORITY'), createTender);
router.put('/:id', requireAuth, requireRole('AUTHORITY'), updateTender);
router.get('/:id', requireAuth, getTender); // Both AUTHORITY and BIDDER can read
router.delete('/:id', requireAuth, requireRole('AUTHORITY'), deleteTender);
router.post('/:id/publish', requireAuth, requireRole('AUTHORITY'), publishTender);

// Section Management
router.post('/:id/sections', requireAuth, requireRole('AUTHORITY'), addSection);
router.put('/sections/:id', requireAuth, requireRole('AUTHORITY'), updateSection);
router.delete('/sections/:id', requireAuth, requireRole('AUTHORITY'), deleteSection);
router.put('/:id/sections/order', requireAuth, requireRole('AUTHORITY'), reorderSections);

export default router;
