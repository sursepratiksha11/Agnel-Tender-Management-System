import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env.js';

const windowMs = parseInt(env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const max = parseInt(env.RATE_LIMIT_MAX || '30', 10);

export const aiRateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: (req, res) => {
    const ipKey = ipKeyGenerator(req, res);
    return req.user?.id ? `${req.user.id}:${ipKey}` : ipKey;
  },
});