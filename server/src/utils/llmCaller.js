/**
 * Provider-Agnostic LLM Caller
 * Supports Groq, Gemini, Hugging Face, OpenAI
 * Includes hard token guard and safe fallback
 */

import { env } from '../config/env.js';
import { TokenCounter } from '../utils/tokenCounter.js';

const PROVIDER_CONFIGS = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
    apiKey: () => env.GROQ_API_KEY,
    format: 'openai',
  },
  gemini: {
    url: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    apiKey: () => env.GEMINI_API_KEY,
    format: 'gemini',
  },
  huggingface: {
    url: (model) => `https://api-inference.huggingface.co/models/${model}`,
    models: ['mistralai/Mistral-7B-Instruct-v0.2', 'meta-llama/Llama-2-70b-chat-hf'],
    apiKey: () => env.HUGGINGFACE_API_KEY,
    format: 'huggingface',
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
    apiKey: () => env.OPENAI_API_KEY,
    format: 'openai',
  },

};

// Proxy export for compatibility
export const callLLM = (...args) => LLMCaller.call(...args);

export const LLMCaller = {
  /**
   * Call LLM with hard token guard
   * @param {Object} options - Call options
   * @param {string} options.systemPrompt - System prompt
   * @param {string} options.userPrompt - User prompt
   * @param {string} options.provider - Provider name (groq, gemini, huggingface, openai)
   * @param {string} options.model - Model name
   * @param {number} options.temperature - Temperature (0-1)
   * @param {number} options.maxTokens - Max response tokens
   * @returns {Promise<string>} LLM response
   */
  async call(options = {}) {
    const {
      systemPrompt = 'You are a helpful assistant.',
      userPrompt,
      provider = this._detectProvider(),
      model = this._getDefaultModel(provider),
      temperature = 0,
      maxTokens = 2000,
    } = options;

    if (!userPrompt) {
      throw new Error('User prompt is required');
    }

    const config = PROVIDER_CONFIGS[provider];
    if (!config) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const apiKey = config.apiKey();
    if (!apiKey) {
      throw new Error(`API key not configured for provider: ${provider}`);
    }

    // HARD TOKEN GUARD
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const tokenCheck = TokenCounter.isSafe(fullPrompt, model);

    console.log(`[LLM] Provider: ${provider}, Model: ${model}`);
    console.log(`[LLM] Token count: ${tokenCheck.tokenCount} / ${tokenCheck.safeLimit} (${tokenCheck.safe ? 'SAFE' : 'OVERFLOW'})`);

    if (!tokenCheck.safe) {
      console.error(`[LLM] TOKEN OVERFLOW: ${tokenCheck.overflow} tokens over limit!`);
      
      // Try to salvage by truncating user prompt
      const budget = TokenCounter.getBudget(model, maxTokens);
      const systemTokens = TokenCounter.estimate(systemPrompt);
      const availableForUser = budget.prompt - systemTokens - 100; // 100 token safety margin

      if (availableForUser > 500) {
        console.warn(`[LLM] Truncating user prompt to ${availableForUser} tokens...`);
        const truncatedUserPrompt = TokenCounter.truncate(userPrompt, availableForUser);
        return this.call({
          ...options,
          userPrompt: truncatedUserPrompt,
        });
      } else {
        throw new Error(
          `Prompt exceeds token limit by ${tokenCheck.overflow} tokens. ` +
          `Cannot safely truncate. Please reduce context size.`
        );
      }
    }

    // Make API call based on provider format
    try {
      if (config.format === 'openai') {
        return await this._callOpenAIFormat(config, model, systemPrompt, userPrompt, temperature, maxTokens);
      } else if (config.format === 'gemini') {
        return await this._callGemini(config, model, systemPrompt, userPrompt, temperature, maxTokens);
      } else if (config.format === 'huggingface') {
        return await this._callHuggingFace(config, model, systemPrompt, userPrompt, temperature, maxTokens);
      } else {
        throw new Error(`Unsupported format: ${config.format}`);
      }
    } catch (error) {
      console.error(`[LLM] API call failed:`, error.message);
      throw error;
    }
  },

  /**
   * Call OpenAI-format API (Groq, OpenAI)
   */
  async _callOpenAIFormat(config, model, systemPrompt, userPrompt, temperature, maxTokens) {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey()}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`LLM API failed: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || '';
  },

  /**
   * Call Gemini API
   */
  async _callGemini(config, model, systemPrompt, userPrompt, temperature, maxTokens) {
    const url = config.url(model) + `?key=${config.apiKey()}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API failed: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  },

  /**
   * Call Hugging Face API
   */
  async _callHuggingFace(config, model, systemPrompt, userPrompt, temperature, maxTokens) {
    const url = config.url(model);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey()}`,
      },
      body: JSON.stringify({
        inputs: `${systemPrompt}\n\n${userPrompt}`,
        parameters: {
          temperature,
          max_new_tokens: maxTokens,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Hugging Face API failed: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      return data[0]?.generated_text?.trim() || '';
    }
    
    return data?.generated_text?.trim() || '';
  },

  /**
   * Detect available provider based on API keys
   */
  _detectProvider() {
    if (env.GROQ_API_KEY) return 'groq';
    if (env.GEMINI_API_KEY) return 'gemini';
    if (env.HUGGINGFACE_API_KEY) return 'huggingface';
    if (env.OPENAI_API_KEY) return 'openai';
    throw new Error('No LLM provider API key configured');
  },

  /**
   * Get default model for provider
   */
  _getDefaultModel(provider) {
    const defaults = {
      groq: env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      gemini: 'gemini-1.5-flash',
      huggingface: 'mistralai/Mistral-7B-Instruct-v0.2',
      openai: 'gpt-3.5-turbo',
    };

    return defaults[provider] || defaults.groq;
  },
};
