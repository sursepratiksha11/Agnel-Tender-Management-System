import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '24h';

async function ensureAssisterConstraints() {
  const constraints = await pool.query(
    `SELECT conname, pg_get_constraintdef(oid) AS def
     FROM pg_constraint
     WHERE conname IN ('user_role_check', 'organization_type_check')`
  );

  const defByName = constraints.rows.reduce((acc, row) => {
    acc[row.conname] = row.def || '';
    return acc;
  }, {});

  const orgHasAssister = (defByName.organization_type_check || '').includes('ASSISTER');
  const userHasAssister = (defByName.user_role_check || '').includes('ASSISTER');

  if (orgHasAssister && userHasAssister) {
    return;
  }

  try {
    await pool.query(`
      ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;
      ALTER TABLE "user" ADD CONSTRAINT user_role_check
        CHECK (role IN ('AUTHORITY', 'BIDDER', 'ASSISTER'));
      ALTER TABLE organization DROP CONSTRAINT IF EXISTS organization_type_check;
      ALTER TABLE organization ADD CONSTRAINT organization_type_check
        CHECK (type IN ('AUTHORITY', 'BIDDER', 'ASSISTER'));
    `);
  } catch (err) {
    throw new Error(
      'Database not migrated for ASSISTER role. Run server/update-to-assister.sql or server/update-to-assister.js'
    );
  }
}

export const AuthService = {
  async signup({ name, email, password, role, organizationName, specialty }) {
    // Validate role
    if (!['AUTHORITY', 'BIDDER', 'ASSISTER'].includes(role)) {
      throw new Error('Invalid role. Must be AUTHORITY, BIDDER, or ASSISTER');
    }

    // Validate specialty for ASSISTER role
    if (role === 'ASSISTER' && !specialty) {
      throw new Error('Specialty is required for Assister role');
    }

    if (role === 'ASSISTER') {
      await ensureAssisterConstraints();
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT user_id FROM "user" WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Create organization (for ASSISTER, use specialty as org name if no org provided)
    const orgName = organizationName || (role === 'ASSISTER' ? `${name} - ${specialty}` : name);
    const orgResult = await pool.query(
      'INSERT INTO organization (name, type) VALUES ($1, $2) RETURNING organization_id',
      [orgName, role]
    );
    const organizationId = orgResult.rows[0].organization_id;

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user with specialty if ASSISTER
    // Use insert that returns the whole row, then normalize fields so it works with either schema
    const userResult = await pool.query(
      'INSERT INTO "user" (name, email, password_hash, role, organization_id, specialty) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, email, passwordHash, role, organizationId, specialty || null]
    );

    const created = userResult.rows[0];
    const normalizedCreated = {
      user_id: created.user_id || created.id,
      name: created.name || created.full_name,
      email: created.email,
      role: created.role,
      organization_id: created.organization_id || null,
      organization_name: orgName,
      specialty: created.specialty || (created.metadata && created.metadata.specialty) || null,
    };

    // Generate JWT
    const token = jwt.sign(
      {
        userId: normalizedCreated.user_id,
        role: normalizedCreated.role,
        organizationId: normalizedCreated.organization_id,
      },
      env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return {
      token,
      user: {
        id: normalizedCreated.user_id,
        name: normalizedCreated.name,
        email: normalizedCreated.email,
        role: normalizedCreated.role ? normalizedCreated.role.toLowerCase() : null,
        organization: normalizedCreated.organization_name,
        organizationId: normalizedCreated.organization_id,
        specialty: normalizedCreated.specialty,
      },
    };
  },

  async login(email, password) {
    // Find user with organization
    // Use available columns (compat with Supabase-auth table where columns may be id/full_name)
    const result = await pool.query(
      `SELECT u.*, o.name as organization_name
       FROM "user" u
       LEFT JOIN organization o ON u.organization_id = o.organization_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];
    // Normalize fields for application
    const normalizedUser = {
      user_id: user.user_id || user.id,
      name: user.name || user.full_name,
      email: user.email,
      password_hash: user.password_hash || (user.metadata && user.metadata.password_hash) || null,
      role: user.role,
      organization_id: user.organization_id || null,
      organization_name: user.organization_name || null,
      specialty: user.specialty || (user.metadata && user.metadata.specialty) || null,
    };

    // Verify password
    const isValidPassword = normalizedUser.password_hash ? await bcrypt.compare(password, normalizedUser.password_hash) : false;
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: normalizedUser.user_id,
        role: normalizedUser.role,
        organizationId: normalizedUser.organization_id,
      },
      env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return {
      token,
      user: {
        id: normalizedUser.user_id,
        name: normalizedUser.name,
        email: normalizedUser.email,
        role: normalizedUser.role ? normalizedUser.role.toLowerCase() : null,
        organization: normalizedUser.organization_name,
        organizationId: normalizedUser.organization_id,
        specialty: normalizedUser.specialty,
      },
    };
  },
};
