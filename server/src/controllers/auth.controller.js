import { AuthService } from '../services/auth.service.js';

export async function signup(req, res, next) {
  try {
    const { name, email, password, role, organizationName, specialty } = req.body;

    // Input validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Missing required fields: name, email, password, role',
      });
    }

    // organizationName is optional for ASSISTER
    // but required for AUTHORITY/BIDDER
    if (['AUTHORITY', 'BIDDER'].includes(role) && !organizationName) {
      return res.status(400).json({
        error: 'Missing required field: organizationName',
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Role validation
    if (!['AUTHORITY', 'BIDDER', 'ASSISTER'].includes(role)) {
      return res.status(400).json({ error: 'Role must be AUTHORITY, BIDDER, or ASSISTER' });
    }

    // Specialty validation for ASSISTER
    if (role === 'ASSISTER' && !specialty) {
      return res.status(400).json({ error: 'Specialty is required for ASSISTER role' });
    }

    const result = await AuthService.signup({
      name,
      email,
      password,
      role,
      organizationName,
      specialty,
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.message === 'Email already registered') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message.startsWith('Database not migrated for ASSISTER role')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err) {
    if (err.message === 'Invalid email or password') {
      return res.status(401).json({ error: err.message });
    }
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
}
