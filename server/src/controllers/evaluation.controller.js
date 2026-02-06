import { EvaluationService } from '../services/evaluation.service.js';

/**
 * Get list of tenders ready for evaluation
 */
export async function getTendersForEvaluation(req, res, next) {
  try {
    const tenders = await EvaluationService.getTendersForEvaluation(req.user);
    res.json({ tenders });
  } catch (err) {
    next(err);
  }
}

/**
 * Get bids for a specific tender
 */
export async function getBidsForTender(req, res, next) {
  try {
    const { tenderId } = req.params;
    const bids = await EvaluationService.getBidsForTender(tenderId, req.user);
    res.json({ bids });
  } catch (err) {
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * Initialize evaluation for a tender
 */
export async function initializeTenderEvaluation(req, res, next) {
  try {
    const { tenderId } = req.params;
    const result = await EvaluationService.initializeTenderEvaluation(tenderId, req.user);
    res.json(result);
  } catch (err) {
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * Update bid evaluation
 */
export async function updateBidEvaluation(req, res, next) {
  try {
    const { proposalId } = req.params;
    const { technical_status, technical_score, remarks } = req.body;

    if (!technical_status) {
      return res.status(400).json({ error: 'Technical status is required' });
    }

    const normalizedScore =
      technical_score === '' || technical_score === null || typeof technical_score === 'undefined'
        ? null
        : Number(technical_score);

    if (normalizedScore !== null && Number.isNaN(normalizedScore)) {
      return res.status(400).json({ error: 'Technical score must be a number' });
    }

    const result = await EvaluationService.updateBidEvaluation(
      proposalId,
      { technical_status, technical_score: normalizedScore, remarks },
      req.user
    );

    res.json(result);
  } catch (err) {
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * Complete evaluation for a tender
 */
export async function completeEvaluation(req, res, next) {
  try {
    const { tenderId } = req.params;
    const result = await EvaluationService.completeEvaluation(tenderId, req.user);
    res.json(result);
  } catch (err) {
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * Get evaluation details for a tender
 */
export async function getTenderEvaluationDetails(req, res, next) {
  try {
    const { tenderId } = req.params;
    const details = await EvaluationService.getTenderEvaluationDetails(tenderId, req.user);
    res.json({ details });
  } catch (err) {
    if (err.message.includes('Unauthorized')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
}
