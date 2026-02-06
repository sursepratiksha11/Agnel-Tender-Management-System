import { env } from '../config/env.js';

// Note: GROQ doesn't provide embeddings. Using mock embeddings for now.
// For production, consider using a dedicated embedding service like HuggingFace or OpenAI embeddings.

export const EmbeddingService = {
  /**
   * Generate mock embedding for text.
   * Returns a 1536-dimensional vector as pgvector-compatible string format
   * @param {string} text
   * @returns {Promise<string>} pgvector format: "[0.1, 0.2, ...]"
   */
  async embed(text) {
    if (!text || !text.trim()) {
      throw new Error('Cannot generate embedding for empty text');
    }

    // Generate a simple deterministic embedding based on text hash
    // This is NOT semantic embedding - just for compatibility
    const hash = simpleHash(text);
    const embedding = new Array(1536).fill(0);

    // Distribute hash value across embedding dimensions for some variance
    for (let i = 0; i < 10; i++) {
      embedding[hash % 1536] = ((hash >> i) & 0xFF) / 255;
      embedding[(hash * (i + 1)) % 1536] = ((hash >> (i + 8)) & 0xFF) / 255;
    }

    // Return as pgvector-compatible string format
    return '[' + embedding.join(',') + ']';
  },
};

/**
 * Simple hash function for deterministic embedding generation
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
