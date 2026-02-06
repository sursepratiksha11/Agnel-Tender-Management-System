import { Router } from 'express';
import { queryTenderAI, generateTenderAI, assistTenderDrafting } from '../controllers/ai.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { aiRateLimiter } from '../middlewares/rate-limit.middleware.js';

const router = Router();

// Both AUTHORITY and BIDDER can query published tenders
router.post('/query', requireAuth, aiRateLimiter, queryTenderAI);

// Admin assistance (no embeddings), AUTHORITY only
router.post('/generate', requireAuth, requireRole('AUTHORITY'), aiRateLimiter, generateTenderAI);

// AI Assistance for drafting (reviews and suggests), AUTHORITY only
router.post('/assist', requireAuth, requireRole('AUTHORITY'), aiRateLimiter, assistTenderDrafting);

// Additional AI endpoints for bidder features
router.post('/explain', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { text, context } = req.body;
    // Placeholder - implement AI explanation logic
    res.json({ 
      explanation: 'This feature is currently being implemented. Please check back later.',
      originalText: text 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/suggest-sections', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { tenderType, context } = req.body;
    // Placeholder - return common sections
    res.json({ 
      suggestions: [
        { name: 'Executive Summary', description: 'Overview of your proposal' },
        { name: 'Technical Approach', description: 'Your methodology and approach' },
        { name: 'Qualifications', description: 'Team expertise and experience' },
        { name: 'Timeline', description: 'Project schedule and milestones' },
        { name: 'Pricing', description: 'Cost breakdown and pricing model' }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-content', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { prompt, context } = req.body;
    // Placeholder
    res.json({ 
      content: 'AI content generation is currently being implemented. Please draft your content manually for now.',
      prompt 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rewrite-legal', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { text, tone } = req.body;
    // Placeholder
    res.json({ 
      rewritten: text,
      message: 'Legal rewriting feature is under development. Please consult legal professionals for formal language.' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/proposal-help', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { question, context } = req.body;
    // Placeholder
    res.json({ 
      answer: 'AI proposal assistance is being enhanced. Please refer to tender requirements and best practices.',
      question 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/check-compliance', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { content, requirements } = req.body;
    // Placeholder
    res.json({ 
      compliant: true,
      issues: [],
      message: 'Compliance checking feature is under development. Please review requirements manually.' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
