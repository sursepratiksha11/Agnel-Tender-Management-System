/**
 * Token Counter Utility
 * Estimates token count for LLM prompts (provider-agnostic)
 * Uses character-based approximation: ~4 chars = 1 token
 */

const CHARS_PER_TOKEN = 4;
const MAX_TOKENS_BY_MODEL = {
  'llama-3.3-70b-versatile': 8000, // Groq
  'llama-3.1-70b-versatile': 8000,
  'gemini-1.5-flash': 8000,
  'gemini-1.5-pro': 32000,
  'gpt-3.5-turbo': 4000,
  'gpt-4': 8000,
  'gpt-4-turbo': 128000,
  default: 6000, // Safe default
};

export const TokenCounter = {
  /**
   * Estimate token count from text
   * @param {string} text - Input text
   * @returns {number} Estimated token count
   */
  estimate(text) {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  },

  /**
   * Get max tokens for a model
   * @param {string} modelName - Model name
   * @returns {number} Max tokens
   */
  getMaxTokens(modelName) {
    return MAX_TOKENS_BY_MODEL[modelName] || MAX_TOKENS_BY_MODEL.default;
  },

  /**
   * Check if prompt is within safe token limit
   * Reserve 25% for response
   * @param {string} prompt - Full prompt text
   * @param {string} modelName - Model name
   * @returns {Object} {safe: boolean, tokenCount: number, maxTokens: number}
   */
  isSafe(prompt, modelName = 'default') {
    const tokenCount = this.estimate(prompt);
    const maxTokens = this.getMaxTokens(modelName);
    const safeLimit = Math.floor(maxTokens * 0.75); // Reserve 25% for response

    return {
      safe: tokenCount <= safeLimit,
      tokenCount,
      maxTokens,
      safeLimit,
      overflow: Math.max(0, tokenCount - safeLimit),
    };
  },

  /**
   * Truncate text to fit within token budget
   * @param {string} text - Text to truncate
   * @param {number} maxTokens - Maximum tokens allowed
   * @returns {string} Truncated text
   */
  truncate(text, maxTokens) {
    if (!text) return '';
    
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    if (text.length <= maxChars) return text;

    return text.substring(0, maxChars) + '\n...[truncated]';
  },

  /**
   * Get token budget breakdown for a request
   * @param {string} modelName - Model name
   * @param {number} responseTokens - Expected response tokens (default: 2000)
   * @returns {Object} Budget allocation
   */
  getBudget(modelName = 'default', responseTokens = 2000) {
    const maxTokens = this.getMaxTokens(modelName);
    const availableForPrompt = maxTokens - responseTokens;

    return {
      total: maxTokens,
      prompt: availableForPrompt,
      response: responseTokens,
      system: Math.floor(availableForPrompt * 0.1), // 10% for system
      context: Math.floor(availableForPrompt * 0.6), // 60% for context
      task: Math.floor(availableForPrompt * 0.3), // 30% for task
    };
  },
};
