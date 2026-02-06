import { pool } from '../config/db.js';

(async () => {
  let exitCode = 0;

  try {
    const { rows } = await pool.query('SELECT NOW();');
    const serverTime = rows?.[0]?.now;
    const formattedTime = serverTime?.toISOString ? serverTime.toISOString() : String(serverTime);

    console.log('PostgreSQL connection successful.');
    console.log('Database server time:', formattedTime);
  } catch (err) {
    exitCode = 1;
    console.error('PostgreSQL connection failed.');
    console.error(err);
  } finally {
    try {
      await pool.end();
    } catch (closeErr) {
      exitCode = exitCode || 1;
      console.error('Error while closing the connection pool:', closeErr);
    } finally {
      process.exit(exitCode);
    }
  }
})();

