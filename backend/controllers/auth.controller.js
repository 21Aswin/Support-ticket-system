const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

async function register(req, res, next) {
  try {
    const { name, email, password, confirm_password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
        errors: ['Missing required fields'],
      });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Full name must be at least 2 characters.',
        errors: ['Invalid name length'],
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
        errors: ['Invalid email format'],
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
        errors: ['Password too short'],
      });
    }

    if (confirm_password !== undefined && password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirmation do not match.',
        errors: ['Password mismatch'],
      });
    }

    // Check if user already exists
    const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [trimmedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
        errors: ['Email already registered'],
      });
    }

    // Get Employee role ID
    const roleRes = await db.query("SELECT id FROM roles WHERE name = 'Employee'");
    const roleId = roleRes.rows.length > 0 ? roleRes.rows[0].id : 3;

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const insertSql = `
      INSERT INTO users (role_id, name, email, password_hash, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
      RETURNING id, name, email, role_id, is_active, created_at
    `;
    const insertRes = await db.query(insertSql, [roleId, trimmedName, trimmedEmail, passwordHash]);
    const newUser = insertRes.rows[0];

    const payload = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: 'Employee',
      role_id: newUser.role_id,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        token,
        user: payload,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
        errors: ['Missing email'],
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const userRes = await db.query('SELECT id, name, email, is_active FROM users WHERE LOWER(email) = LOWER($1)', [trimmedEmail]);

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      // Return success without revealing if email exists for security
      return res.status(200).json({
        success: true,
        message: 'If an active account exists with that email, a password reset link has been prepared.',
        data: {},
      });
    }

    const user = userRes.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'INSERT INTO password_resets (email, token, expires_at, used) VALUES ($1, $2, $3, FALSE)',
      [user.email, resetToken, expiresAt]
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset link generated successfully.',
      data: {
        email: user.email,
        name: user.name,
        reset_token: resetToken,
        expires_at: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password, confirm_password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required.',
        errors: ['Missing required fields'],
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
        errors: ['Password too short'],
      });
    }

    if (confirm_password !== undefined && password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match.',
        errors: ['Password mismatch'],
      });
    }

    const resetRes = await db.query(
      'SELECT id, email, expires_at, used FROM password_resets WHERE token = $1 ORDER BY id DESC LIMIT 1',
      [token.trim()]
    );

    if (resetRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password reset token.',
        errors: ['Invalid token'],
      });
    }

    const record = resetRes.rows[0];

    if (record.used) {
      return res.status(400).json({
        success: false,
        message: 'This password reset link has already been used.',
        errors: ['Token already used'],
      });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This password reset link has expired. Please request a new one.',
        errors: ['Token expired'],
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = LOWER($2)',
      [passwordHash, record.email]
    );

    // Mark token as used
    await db.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [record.id]);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You may now log in with your new password.',
      data: {
        email: record.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  getProfile,
  register,
  forgotPassword,
  resetPassword,
};
