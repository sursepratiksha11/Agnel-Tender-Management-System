import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || (err.message === 'Not allowed by CORS' ? 403 : 500);
  const isServerError = status >= 500;

  logger.error(`[${req.method} ${req.originalUrl}] ${err.stack || err.message || String(err)}`);

  const payload = {
    error: isServerError ? 'Internal Server Error' : err.message || 'Unexpected error',
  };

  if (err.code) {
    payload.code = err.code;
  }

  res.status(status).json(payload);
}
