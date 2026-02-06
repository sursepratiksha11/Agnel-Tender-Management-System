import app from './app.js';
import { loadEnv, getEnv } from './config/env.js';
import { logger } from './utils/logger.js';

loadEnv();

const port = getEnv('PORT', '5000');
app.listen(port, () => {
  logger.info(`Server listening on http://localhost:${port}`);
});
