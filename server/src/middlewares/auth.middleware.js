import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    // Get full user from database
    const result = await pool.query(
      `SELECT u.user_id, u.name, u.email, u.role, u.organization_id, o.name as organization_name
       FROM "user" u
       JOIN organization o ON u.organization_id = o.organization_id
       WHERE u.user_id = $1`,
      [payload.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    req.user = {
      id: user.user_id,
      userId: user.user_id,  // Add for backwards compatibility
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
      organization: user.organization_name,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
