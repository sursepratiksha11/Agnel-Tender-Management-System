/**
 * Uploaded Tender Routes
 * Routes for managing uploaded PDF tenders
 */
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { uploadedTenderController } from '../controllers/uploadedTender.controller.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get user's uploaded tenders
router.get('/my-uploads', uploadedTenderController.getUserUploadedTenders);

// Get specific uploaded tender
router.get('/:id', uploadedTenderController.getById);

export default router;
