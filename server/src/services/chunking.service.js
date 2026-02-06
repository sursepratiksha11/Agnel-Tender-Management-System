            /**
 * Enhanced Chunking Service for RAG
 *
 * Features:
 * - Configurable chunk size and overlap
 * - Metadata tagging for better retrieval
 * - Section type inference
 * - Sentence-aware chunking option
 */

const DEFAULT_CHUNK_SIZE = 450;
const DEFAULT_CHUNK_OVERLAP = 50;
const MIN_CHUNK_SIZE = 200;

/**
 * Infer section type from title
 */
function inferSectionType(title) {
  const titleLower = (title || '').toLowerCase();

  if (titleLower.includes('eligib') || titleLower.includes('qualif') || titleLower.includes('pre-qualification')) {
    return 'ELIGIBILITY';
  }
  if (titleLower.includes('technic') || titleLower.includes('method') || titleLower.includes('scope') || titleLower.includes('specification')) {
    return 'TECHNICAL';
  }
  if (titleLower.includes('financ') || titleLower.includes('price') || titleLower.includes('cost') || titleLower.includes('payment') || titleLower.includes('emd')) {
    return 'FINANCIAL';
  }
  if (titleLower.includes('evalua') || titleLower.includes('criteria') || titleLower.includes('score') || titleLower.includes('marking')) {
    return 'EVALUATION';
  }
  if (titleLower.includes('term') || titleLower.includes('condition') || titleLower.includes('legal') || titleLower.includes('general')) {
    return 'TERMS';
  }
  if (titleLower.includes('intro') || titleLower.includes('about') || titleLower.includes('overview')) {
    return 'OVERVIEW';
  }

  return 'GENERAL';
}

/**
 * Extract key terms from content for metadata
 */
function extractKeyTerms(content) {
  const text = (content || '').toLowerCase();
  const terms = [];

  // Check for important categories
  if (text.match(/experience|years?\s+of|track\s+record/)) terms.push('experience');
  if (text.match(/iso|certification|certified|registration/)) terms.push('certification');
  if (text.match(/turnover|financial|revenue|capital/)) terms.push('financial');
  if (text.match(/emd|earnest\s+money|security\s+deposit/)) terms.push('emd');
  if (text.match(/penalty|liquidated|damages/)) terms.push('penalty');
  if (text.match(/warranty|guarantee|defect/)) terms.push('warranty');
  if (text.match(/payment|milestone|installment/)) terms.push('payment');
  if (text.match(/deadline|submission|last\s+date/)) terms.push('deadline');
  if (text.match(/technical|specification|methodology/)) terms.push('technical');
  if (text.match(/evaluation|scoring|marks/)) terms.push('evaluation');

  return terms;
}

/**
 * Calculate importance score for a chunk
 */
function calculateImportance(content, metadata) {
  let score = 5; // Base score (1-10)

  // Boost for mandatory sections
  if (metadata.isMandatory) score += 2;

  // Boost for key terms
  const keyTerms = extractKeyTerms(content);
  score += Math.min(keyTerms.length, 3);

  // Boost for specific important patterns
  if (content.match(/must|shall|mandatory|required|essential/i)) score += 1;
  if (content.match(/₹|rs\.?\s*\d|crore|lakh/i)) score += 1;
  if (content.match(/\d+\s*(days?|months?|years?)/i)) score += 1;

  return Math.min(score, 10);
}

/**
 * Chunk text with overlap (word-based)
 */
function chunkTextWithOverlap(text, options = {}) {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    overlap = DEFAULT_CHUNK_OVERLAP,
    metadata = {},
  } = options;

  if (!text || !text.trim()) return [];

  const words = text.trim().split(/\s+/);
  const chunks = [];
  let startIdx = 0;
  let chunkIndex = 0;

  while (startIdx < words.length) {
    const endIdx = Math.min(startIdx + chunkSize, words.length);
    const chunkWords = words.slice(startIdx, endIdx);
    const chunkContent = chunkWords.join(' ');

    // Calculate chunk-specific metadata
    const keyTerms = extractKeyTerms(chunkContent);
    const importance = calculateImportance(chunkContent, metadata);

    chunks.push({
      content: chunkContent,
      metadata: {
        ...metadata,
        chunkIndex,
        startWord: startIdx,
        endWord: endIdx,
        wordCount: chunkWords.length,
        keyTerms,
        importance,
        hasOverlap: chunkIndex > 0,
      },
    });

    chunkIndex++;

    // Move to next chunk with overlap
    startIdx = endIdx - overlap;

    // Prevent infinite loop for very small remaining content
    if (startIdx >= words.length - overlap && endIdx === words.length) {
      break;
    }
  }

  return chunks;
}

/**
 * Chunk text by sentences (preserves sentence boundaries)
 */
function chunkTextBySentences(text, options = {}) {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    overlap = DEFAULT_CHUNK_OVERLAP,
    metadata = {},
  } = options;

  if (!text || !text.trim()) return [];

  // Split by sentences (handling common abbreviations)
  const sentences = text
    .replace(/([.!?])\s+/g, '$1|||')
    .split('|||')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;
  let chunkIndex = 0;
  let overlapSentences = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceWordCount = sentence.split(/\s+/).length;

    // If adding this sentence exceeds chunk size, save current chunk
    if (currentWordCount + sentenceWordCount > chunkSize && currentChunk.length > 0) {
      const chunkContent = currentChunk.join(' ');
      const keyTerms = extractKeyTerms(chunkContent);
      const importance = calculateImportance(chunkContent, metadata);

      chunks.push({
        content: chunkContent,
        metadata: {
          ...metadata,
          chunkIndex,
          wordCount: currentWordCount,
          sentenceCount: currentChunk.length,
          keyTerms,
          importance,
          hasOverlap: chunkIndex > 0,
        },
      });

      chunkIndex++;

      // Keep last few sentences for overlap
      const overlapWordTarget = overlap;
      overlapSentences = [];
      let overlapWords = 0;

      for (let j = currentChunk.length - 1; j >= 0 && overlapWords < overlapWordTarget; j--) {
        overlapSentences.unshift(currentChunk[j]);
        overlapWords += currentChunk[j].split(/\s+/).length;
      }

      currentChunk = [...overlapSentences];
      currentWordCount = overlapWords;
    }

    currentChunk.push(sentence);
    currentWordCount += sentenceWordCount;
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    const chunkContent = currentChunk.join(' ');

    // Only add if it has meaningful content
    if (currentWordCount >= MIN_CHUNK_SIZE || chunks.length === 0) {
      const keyTerms = extractKeyTerms(chunkContent);
      const importance = calculateImportance(chunkContent, metadata);

      chunks.push({
        content: chunkContent,
        metadata: {
          ...metadata,
          chunkIndex,
          wordCount: currentWordCount,
          sentenceCount: currentChunk.length,
          keyTerms,
          importance,
          hasOverlap: chunkIndex > 0,
        },
      });
    } else if (chunks.length > 0) {
      // Merge with previous chunk if too small
      const lastChunk = chunks[chunks.length - 1];
      lastChunk.content += ' ' + chunkContent;
      lastChunk.metadata.wordCount += currentWordCount;
    }
  }

  return chunks;
}

/**
 * Legacy function for backward compatibility
 */
function chunkTextByTokens(text, minTokens = MIN_CHUNK_SIZE, maxTokens = DEFAULT_CHUNK_SIZE) {
  if (!text || !text.trim()) return [];

  const words = text.trim().split(/\s+/);
  const chunks = [];
  let buffer = [];

  for (const word of words) {
    buffer.push(word);
    if (buffer.length >= maxTokens) {
      chunks.push(buffer.join(' '));
      buffer = [];
    }
  }

  if (buffer.length) {
    if (buffer.length < minTokens && chunks.length) {
      const last = chunks.pop();
      chunks.push(`${last} ${buffer.join(' ')}`.trim());
    } else {
      chunks.push(buffer.join(' '));
    }
  }

  return chunks;
}

export const ChunkingService = {
  // Configuration
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  MIN_CHUNK_SIZE,

  // Utility functions
  inferSectionType,
  extractKeyTerms,
  calculateImportance,

  /**
   * Enhanced chunk tender content with overlap and metadata
   *
   * @param {Object} tenderData
   * @param {string} tenderData.tenderId
   * @param {string} tenderData.tenderTitle
   * @param {string} tenderData.tenderDescription
   * @param {string} tenderData.sector
   * @param {string} tenderData.tenderType
   * @param {Array<{sectionId:string, title:string, content?:string, isMandatory?:boolean}>} tenderData.sections
   * @param {Object} options
   * @param {number} options.chunkSize - Target chunk size in words (default: 450)
   * @param {number} options.overlap - Overlap between chunks (default: 50)
   * @param {boolean} options.useSentenceChunking - Preserve sentence boundaries (default: false)
   * @returns {Array<{tenderId:string, sectionId:string|null, content:string, metadata:Object}>}
   */
  chunkTenderEnhanced(tenderData, options = {}) {
    const {
      tenderId,
      tenderTitle = '',
      tenderDescription = '',
      sector = '',
      tenderType = '',
      sections = [],
    } = tenderData;

    const {
      chunkSize = DEFAULT_CHUNK_SIZE,
      overlap = DEFAULT_CHUNK_OVERLAP,
      useSentenceChunking = false,
    } = options;

    const chunkFn = useSentenceChunking ? chunkTextBySentences : chunkTextWithOverlap;
    const results = [];

    // Chunk tender overview
    const overviewText = `${tenderTitle}\n\n${tenderDescription}`.trim();
    if (overviewText.length > 50) {
      const overviewChunks = chunkFn(overviewText, {
        chunkSize,
        overlap,
        metadata: {
          tenderId,
          sectionType: 'OVERVIEW',
          sectionTitle: 'Tender Overview',
          sector,
          tenderType,
          isMandatory: true,
        },
      });

      overviewChunks.forEach((chunk) => {
        results.push({
          tenderId,
          sectionId: null,
          content: chunk.content,
          metadata: chunk.metadata,
        });
      });
    }

    // Chunk each section
    sections.forEach((section) => {
      const sectionContent = section.content || section.description || '';
      if (sectionContent.length < 30) return; // Skip very short sections

      const combined = `${section.title || ''}\n\n${sectionContent}`.trim();
      const sectionType = inferSectionType(section.title);

      const sectionChunks = chunkFn(combined, {
        chunkSize,
        overlap,
        metadata: {
          tenderId,
          sectionId: section.sectionId,
          sectionType,
          sectionTitle: section.title,
          isMandatory: section.isMandatory || section.is_mandatory || false,
          sector,
          tenderType,
        },
      });

      sectionChunks.forEach((chunk) => {
        results.push({
          tenderId,
          sectionId: section.sectionId || null,
          content: chunk.content,
          metadata: chunk.metadata,
        });
      });
    });

    return results;
  },

  /**
   * Legacy chunk tender (backward compatible)
   *
   * @param {Object} tenderData
   * @param {string} tenderData.tenderId
   * @param {string} tenderData.tenderTitle
   * @param {string} tenderData.tenderDescription
   * @param {Array<{sectionId:string, title:string, content?:string}>} tenderData.sections
   * @returns {Array<{tenderId:string, sectionId:string|null, content:string}>}
   */
  chunkTender(tenderData) {
    const { tenderId, tenderTitle = '', tenderDescription = '', sections = [] } = tenderData;

    const results = [];

    // Include the main tender overview as the first chunk source
    const overviewText = `${tenderTitle}\n\n${tenderDescription}`.trim();
    const overviewChunks = chunkTextByTokens(overviewText);
    overviewChunks.forEach((content) => {
      results.push({ tenderId, sectionId: null, content });
    });

    // Process each section: combine title + content, then chunk
    sections.forEach((section) => {
      const combined = `${section.title || ''}\n\n${section.content || ''}`.trim();
      const chunks = chunkTextByTokens(combined);
      chunks.forEach((content) => {
        results.push({ tenderId, sectionId: section.sectionId || null, content });
      });
    });

    return results;
  },

  /**
   * Chunk arbitrary text with options
   *
   * @param {string} text - Text to chunk
   * @param {Object} options - Chunking options
   * @returns {Array<{content:string, metadata:Object}>}
   */
  chunkText(text, options = {}) {
    const { useSentenceChunking = false, ...rest } = options;

    if (useSentenceChunking) {
      return chunkTextBySentences(text, rest);
    }
    return chunkTextWithOverlap(text, rest);
  },
};
