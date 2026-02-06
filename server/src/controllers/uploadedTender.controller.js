/**
 * Uploaded Tender Controller
 * Handles HTTP requests for uploaded tender operations
 */
import { UploadedTenderService } from '../services/uploadedTender.service.js';

export const uploadedTenderController = {
  /**
   * Get uploaded tenders for the authenticated user
   * GET /api/uploaded-tender/my-uploads
   */
  async getUserUploadedTenders(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10, offset = 0 } = req.query;

      const tenders = await UploadedTenderService.getUserUploadedTenders(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json(tenders);
    } catch (error) {
      console.error('[UploadedTender] Get user uploads error:', error);
      res.status(500).json({
        error: 'Failed to fetch uploaded tenders',
        details: error.message
      });
    }
  },

  /**
   * Get single uploaded tender by ID
   * GET /api/uploaded-tender/:id
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;

      const tender = await UploadedTenderService.findById(id);

      if (!tender) {
        return res.status(404).json({ error: 'Tender not found' });
      }

      // Verify user has access to this tender
      if (tender.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(tender);
    } catch (error) {
      console.error('[UploadedTender] Get by ID error:', error);
      res.status(500).json({
        error: 'Failed to fetch tender',
        details: error.message
      });
    }
  }
};
