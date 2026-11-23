const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_helpdesk_key_2026_secure';

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid.',
        errors: ['Missing or malformed Authorization header'],
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token. Please log in again.',
        errors: [jwtErr.message],
      });
    }

    // Verify user exists and is active in database
    const queryText = `
      SELECT u.id, u.name, u.email, u.is_active, r.id as role_id, r.name as role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const result = await db.query(queryText, [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.',
        errors: ['Account no longer exists'],
      });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact an administrator.',
        errors: ['User account inactive'],
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      role_id: user.role_id,
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
      errors: [error.message],
    });
  }
}

module.exports = { authenticate, JWT_SECRET };
