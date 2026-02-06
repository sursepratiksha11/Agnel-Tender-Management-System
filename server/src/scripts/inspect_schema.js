import { pool } from '../config/db.js';

async function inspect() {
  try {
    const tables = ['proposal', 'proposals', 'user', 'users', 'proposal_audit_log'];

    for (const t of tables) {
      const tableRes = await pool.query(
        `SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_name = $1`,
        [t]
      );
      console.log('\n---- TABLE:', t, '----');
      if (tableRes.rows.length === 0) {
        console.log('  NOT FOUND');
        continue;
      }
      console.table(tableRes.rows);

      const colRes = await pool.query(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [t]
      );
      console.log('  COLUMNS:');
      console.table(colRes.rows);

      const pkRes = await pool.query(
        `SELECT tc.constraint_name, kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu USING (constraint_name)
         WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'`,
        [t]
      );
      console.log('  PRIMARY KEYS:');
      console.table(pkRes.rows);

      const fkRes = await pool.query(
        `SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
         WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'`,
        [t]
      );
      console.log('  FOREIGN KEYS:');
      console.table(fkRes.rows);

      const uniqueRes = await pool.query(
        `SELECT tc.constraint_name, kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu USING (constraint_name)
         WHERE tc.table_name = $1 AND tc.constraint_type = 'UNIQUE'`,
        [t]
      );
      console.log('  UNIQUE CONSTRAINTS:');
      console.table(uniqueRes.rows);
    }
  } catch (err) {
    console.error('Inspect failed:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

inspect();
