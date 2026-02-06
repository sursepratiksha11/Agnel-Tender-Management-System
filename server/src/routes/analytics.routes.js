import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import {
  getAnalytics,
  getTenderPerformance,
  getBidTimeline,
  getEvaluationSummary,
} from '../controllers/analytics.controller.js';

const router = Router();

router.get('/', requireAuth, requireRole('AUTHORITY'), getAnalytics);
router.get('/performance', requireAuth, requireRole('AUTHORITY'), getTenderPerformance);
router.get('/bids/timeline', requireAuth, requireRole('AUTHORITY'), getBidTimeline);
router.get('/evaluation/summary', requireAuth, requireRole('AUTHORITY'), getEvaluationSummary);

export default router;
