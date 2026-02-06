import { Pool } from 'pg';
import dns from 'dns';
import { env, loadEnv } from './env.js';

// Force IPv4 DNS resolution to avoid ENETUNREACH on IPv6
dns.setDefaultResultOrder('ipv4first');

loadEnv();

// Parse the DATABASE_URL to extract components
const url = new URL(env.DATABASE_URL);

const poolConfig = {
  connectionString: env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('[DB] ✓ Connected to Supabase PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle PostgreSQL client:', err);
  process.exit(1);
});
