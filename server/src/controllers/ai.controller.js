import { AIService } from '../services/ai.service.js';

export async function queryTenderAI(req, res, next) {
  try {
    const { tenderId, question } = req.body;

    if (!tenderId || !question) {
      return res.status(400).json({ error: 'tenderId and question are required' });
    }

    try {
      const answer = await AIService.queryTenderAI(tenderId, question);
      res.json({ answer });
    } catch (err) {
      if (err.message === 'Tender not found') {
        return res.status(404).json({ error: err.message });
      }
      if (err.message === 'Tender must be published to query AI') {
        return res.status(403).json({ error: err.message });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

export async function generateTenderAI(req, res, next) {
  try {
    const { tenderId, prompt } = req.body;

    if (!tenderId || !prompt) {
      return res.status(400).json({ error: 'tenderId and prompt are required' });
    }

    try {
      const answer = await AIService.generateTenderContent(tenderId, prompt);
      res.json({ answer });
    } catch (err) {
      if (err.message === 'Tender not found') {
        return res.status(404).json({ error: err.message });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

export async function assistTenderDrafting(req, res, next) {
  try {
    const { mode, sectionType, existingContent, tenderMetadata, userQuestion } = req.body;

    if (!mode || existingContent === undefined || !userQuestion) {
      return res.status(400).json({
        error: 'mode, existingContent, and userQuestion are required. existingContent can be empty but must be provided.'
      });
    }

    if (mode !== 'section' && mode !== 'tender') {
      return res.status(400).json({ error: 'mode must be "section" or "tender"' });
    }

    try {
      const suggestions = await AIService.assistTenderDrafting({
        mode,
        sectionType,
        existingContent,
        tenderMetadata,
        userQuestion,
      });
      res.json({ suggestions });
    } catch (err) {
      if (err.message?.includes('API')) {
        return res.status(503).json({ error: 'AI service unavailable. Please try again.' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}
