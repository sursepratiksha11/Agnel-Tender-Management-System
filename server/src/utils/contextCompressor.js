/**
 * Context Compression Layer
 * Compresses retrieved chunks before sending to LLM
 * Preserves legal meaning while reducing token count
 */

import { TokenCounter } from './tokenCounter.js';

export const ContextCompressor = {
  /**
   * Compress a single chunk to 2-3 sentences
   * @param {string} text - Full chunk text
   * @param {number} maxSentences - Max sentences to keep (default: 3)
   * @returns {string} Compressed text
   */
  compressChunk(text, maxSentences = 3) {
    if (!text) return '';

    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();

    // Split into sentences (simple heuristic)
    const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 10);

    if (sentences.length <= maxSentences) {
      return cleaned.substring(0, 500); // Max 500 chars per chunk
    }

    // Keep first sentence and most important ones
    const compressed = [];
    compressed.push(sentences[0]); // Always include first sentence

    // Find sentences with important keywords
    const importantKeywords = [
      'mandatory', 'required', 'must', 'shall', 'minimum', 'maximum',
      'eligibility', 'criteria', 'deadline', 'penalty', 'disqualified',
      'compliance', 'specification', 'price', 'payment', 'EMD', 'tender',
      'amount', 'percentage', 'years', 'experience', 'certificate',
    ];

    const scoredSentences = sentences.slice(1).map((sentence, idx) => {
      const lowerSentence = sentence.toLowerCase();
      const keywordScore = importantKeywords.reduce((score, keyword) => {
        return score + (lowerSentence.includes(keyword) ? 1 : 0);
      }, 0);

      // Prefer sentences with numbers (likely contain specific requirements)
      const hasNumbers = /\d+/.test(sentence);
      const numberScore = hasNumbers ? 2 : 0;

      return {
        sentence,
        score: keywordScore + numberScore,
        index: idx,
      };
    });

    // Sort by score and take top N-1 sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    const topSentences = scoredSentences.slice(0, maxSentences - 1);

    // Add top sentences in original order
    topSentences.sort((a, b) => a.index - b.index);
    topSentences.forEach(s => compressed.push(s.sentence));

    const result = compressed.join('. ').trim() + '.';
    return result.substring(0, 500); // Hard limit at 500 chars
  },

  /**
   * Compress multiple chunks
   * @param {Array<string>} chunks - Array of chunk texts
   * @param {number} maxSentencesPerChunk - Max sentences per chunk
   * @returns {Array<string>} Compressed chunks
   */
  compressChunks(chunks, maxSentencesPerChunk = 3) {
    if (!chunks || chunks.length === 0) return [];

    return chunks.map(chunk => this.compressChunk(chunk, maxSentencesPerChunk));
  },

  /**
   * Compress chunks to fit within token budget
   * @param {Array<string>} chunks - Array of chunk texts
   * @param {number} maxTokens - Maximum tokens allowed
   * @returns {Array<string>} Compressed and possibly trimmed chunks
   */
  compressToFit(chunks, maxTokens) {
    if (!chunks || chunks.length === 0) return [];

    let compressed = this.compressChunks(chunks);
    let totalTokens = TokenCounter.estimate(compressed.join('\n\n'));

    // If still too large, reduce sentence count
    if (totalTokens > maxTokens && compressed.length > 0) {
      compressed = this.compressChunks(chunks, 2); // Reduce to 2 sentences
      totalTokens = TokenCounter.estimate(compressed.join('\n\n'));
    }

    // If still too large, drop chunks from the end
    if (totalTokens > maxTokens) {
      while (compressed.length > 0 && totalTokens > maxTokens) {
        compressed.pop();
        totalTokens = TokenCounter.estimate(compressed.join('\n\n'));
      }
    }

    return compressed;
  },

  /**
   * Create summary from compressed chunks
   * @param {Array<string>} chunks - Compressed chunks
   * @param {string} label - Label for the context (e.g., "SESSION", "GLOBAL")
   * @returns {string} Formatted context string
   */
  formatContext(chunks, label = 'CONTEXT') {
    if (!chunks || chunks.length === 0) return '';

    const formatted = chunks
      .map((chunk, idx) => `[${label}-${idx + 1}] ${chunk}`)
      .join('\n\n');

    return formatted;
  },

  /**
   * Remove filler words and phrases
   * @param {string} text - Input text
   * @returns {string} Text with filler removed
   */
  removeFiller(text) {
    if (!text) return '';

    const fillerPhrases = [
      'for example', 'such as', 'i.e.', 'e.g.', 'note that',
      'please note', 'it should be noted', 'as mentioned',
      'furthermore', 'moreover', 'however', 'nevertheless',
    ];

    let result = text;
    fillerPhrases.forEach(phrase => {
      const regex = new RegExp(phrase + '[^.!?]*[.!?]', 'gi');
      result = result.replace(regex, '');
    });

    return result.replace(/\s+/g, ' ').trim();
  },
};
