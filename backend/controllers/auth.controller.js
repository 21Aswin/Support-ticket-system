const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/authenticate');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
        errors: ['Missing credentials'],
      });
    }

    const queryText = `
      SELECT u.id, u.name, u.email, u.password_hash, u.is_active, r.id as role_id, r.name as role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE LOWER(u.email) = LOWER($1)
    `;
    const result = await db.query(queryText, [email.trim()]);

    if (result.rows.length === 0) {
      // Use generic error message to prevent account enumeration
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        errors: ['Authentication failed'],
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently deactivated. Please contact an administrator.',
        errors: ['Account deactivated'],
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        errors: ['Authentication failed'],
      });
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      role_id: user.role_id,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: payload,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const queryText = `
      SELECT u.id, u.name, u.email, u.is_active, u.created_at, r.id as role_id, r.name as role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const result = await db.query(queryText, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
        errors: ['User does not exist'],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  getProfile,
};
