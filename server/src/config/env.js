import dotenv from 'dotenv';

let loaded = false;

const REQUIRED_DB_VARS = ['DATABASE_URL'];
const REQUIRED_AUTH_VARS = ['JWT_SECRET'];
const REQUIRED_AI_VARS = ['GROQ_API_KEY'];

export function loadEnv() {
  if (loaded) return;

  dotenv.config();
  loaded = true;

  const missingDb = REQUIRED_DB_VARS.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim() === '';
  });

  const missingAuth = REQUIRED_AUTH_VARS.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim() === '';
  });

  const missingAI = REQUIRED_AI_VARS.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim() === '';
  });

  if (missingDb.length > 0) {
    throw new Error(`Missing required database environment variables: ${missingDb.join(', ')}`);
  }

  if (missingAuth.length > 0) {
    throw new Error(`Missing required auth environment variables: ${missingAuth.join(', ')}`);
  }

  if (missingAI.length > 0) {
    throw new Error(`Missing required AI environment variables: ${missingAI.join(', ')}`);
  }
}

function ensureLoaded() {
  if (!loaded) {
    loadEnv();
  }
}

export function getEnv(key, defaultValue = undefined) {
  ensureLoaded();
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value;
}

export const env = (() => {
  ensureLoaded();
  return {
    PORT: process.env.PORT || '5000',
    DATABASE_URL: process.env.DATABASE_URL,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    // OpenAI API (for embeddings and proposal drafting)
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    // Gemini API (for post-processing and formatting)
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    // Optional AI tuning
    GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    AI_TEMPERATURE: process.env.AI_TEMPERATURE || '0',
    // HTTP security & performance
    CORS_ORIGINS: process.env.CORS_ORIGINS || '', // comma-separated list
    CORS_ALLOW_CREDENTIALS: process.env.CORS_ALLOW_CREDENTIALS || 'false',
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || '60000',
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || '30',
  };
})();

