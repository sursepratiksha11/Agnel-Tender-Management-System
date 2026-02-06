import { TenderService } from '../services/tender.service.js';

/**
 * List tenders (role-based filtering)
 */
export async function listTenders(req, res, next) {
  try {
    const { status } = req.query;
    const tenders = await TenderService.listTenders(req.user, { status });
    res.json({ tenders });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new tender
 */
export async function createTender(req, res, next) {
  try {
    const { title, description, submission_deadline } = req.body;

    if (!title || !description || !submission_deadline) {
      return res.status(400).json({
        error: 'Missing required fields: title, description, submission_deadline',
      });
    }

    const tender = await TenderService.createTender(
      { title, description, submission_deadline },
      req.user
    );

    res.status(201).json(tender);
  } catch (err) {
    next(err);
  }
}

/**
 * Update a tender (only DRAFT status)
 */
export async function updateTender(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, submission_deadline } = req.body;

    const tender = await TenderService.updateTender(
      id,
      { title, description, submission_deadline },
      req.user
    );

    res.json(tender);
  } catch (err) {
    if (err.message === 'Tender not found') {
      return res.status(404).json({ error: err.message });
    }
    if (
      err.message.includes('Unauthorized') ||
      err.message === 'Cannot update published tender'
    ) {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * Get a tender by ID
 */
export async function getTender(req, res, next) {
  try {
    const { id } = req.params;
    const tender = await TenderService.getTenderById(id, req.user);
    res.json(tender);
  } catch (err) {
    if (err.message === 'Tender not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * Delete a tender (DRAFT only)
 */
export async function deleteTender(req, res, next) {
  try {
    const { id } = req.params;
    const result = await TenderService.deleteTender(id, req.user);
    res.json(result);
  } catch (err) {
    if (err.message === 'Tender not found') {
      return res.status(404).json({ error: err.message });
    }
    if (
      err.message.includes('Unauthorized') ||
      err.message.includes('Cannot delete published')
    ) {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * Publish a tender (DRAFT → PUBLISHED)
 */
export async function publishTender(req, res, next) {
  try {
    const { id } = req.params;
    const tender = await TenderService.publishTender(id, req.user);
    res.json(tender);
  } catch (err) {
    if (err.message === 'Tender not found') {
      return res.status(404).json({ error: err.message });
    }
    if (
      err.message.includes('Unauthorized') ||
      err.message.includes('already published') ||
      err.message.includes('without sections')
    ) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * Add a section to a tender
 */
export async function addSection(req, res, next) {
  try {
    const { id } = req.params;
    const { title, is_mandatory, content, section_key, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Section title is required' });
    }

    const section = await TenderService.addSection(id, { title, is_mandatory, content, section_key, description }, req.user);

    res.status(201).json(section);
  } catch (err) {
    if (err.message === 'Tender not found') {
      return res.status(404).json({ error: err.message });
    }
    if (
      err.message.includes('Unauthorized') ||
      err.message.includes('Cannot add sections')
    ) {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * Update a section
 */
export async function updateSection(req, res, next) {
  try {
    const { id } = req.params;
    const { title, is_mandatory } = req.body;

    const section = await TenderService.updateSection(id, { title, is_mandatory }, req.user);

    res.json(section);
  } catch (err) {
    if (err.message === 'Section not found') {
      return res.status(404).json({ error: err.message });
    }
    if (
      err.message.includes('Unauthorized') ||
      err.message.includes('Cannot update sections')
    ) {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * Delete a section
 */
export async function deleteSection(req, res, next) {
  try {
    const { id } = req.params;
    const result = await TenderService.deleteSection(id, req.user);
    res.json(result);
  } catch (err) {
    if (err.message === 'Section not found') {
      return res.status(404).json({ error: err.message });
    }
    if (
      err.message.includes('Unauthorized') ||
      err.message.includes('Cannot delete sections')
    ) {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * Reorder sections
 */
export async function reorderSections(req, res, next) {
  try {
    const { id } = req.params;
    const { orderedSectionIds } = req.body;

    if (!Array.isArray(orderedSectionIds)) {
      return res.status(400).json({ error: 'orderedSectionIds must be an array' });
    }

    const sections = await TenderService.reorderSections(id, orderedSectionIds, req.user);

    res.json(sections);
  } catch (err) {
    if (err.message === 'Tender not found') {
      return res.status(404).json({ error: err.message });
    }
    if (
      err.message.includes('Unauthorized') ||
      err.message.includes('Cannot reorder sections') ||
      err.message.includes('do not belong')
    ) {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
}
