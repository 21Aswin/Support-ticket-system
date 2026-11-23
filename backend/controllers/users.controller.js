const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function listUsers(req, res, next) {
  try {
    const { role, is_active } = req.query;
    const conditions = [];
    const params = [];

    if (role) {
      params.push(role);
      conditions.push(`r.name = $${params.length}`);
    }

    if (is_active !== undefined) {
      params.push(is_active === 'true' || is_active === '1');
      conditions.push(`u.is_active = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at,
             r.id as role_id, r.name as role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY u.created_at DESC
    `;
    const result = await db.query(sql, params);

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const targetId = parseInt(req.params.id, 10);

    // Only Admin or self can view
    if (req.user.role !== 'Admin' && req.user.id !== targetId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
        errors: ['You can only access your own user profile'],
      });
    }

    const sql = `
      SELECT u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at,
             r.id as role_id, r.name as role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const result = await db.query(sql, [targetId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        errors: ['User does not exist'],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User details retrieved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, role_id } = req.body;

    if (!name || !email || !password || !role_id) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required.',
        errors: ['Missing required user fields'],
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.',
        errors: ['Malformed email'],
      });
    }

    // Verify role exists
    const roleCheck = await db.query('SELECT id, name FROM roles WHERE id = $1', [role_id]);
    if (roleCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role selected.',
        errors: ['Role ID not found'],
      });
    }

    // Check for email collision
    const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.',
        errors: ['Email already in use'],
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertSql = `
      INSERT INTO users (name, email, password_hash, role_id, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
      RETURNING id, name, email, role_id, is_active, created_at
    `;
    const result = await db.query(insertSql, [name.trim(), email.trim(), passwordHash, role_id]);

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        ...result.rows[0],
        role: roleCheck.rows[0].name,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { name, email, password, role_id, is_active } = req.body;

    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [targetId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        errors: ['User does not exist'],
      });
    }

    const updates = [];
    const params = [];

    if (name) {
      params.push(name.trim());
      updates.push(`name = $${params.length}`);
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format.',
          errors: ['Malformed email'],
        });
      }
      // Check collision
      const dup = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2', [email.trim(), targetId]);
      if (dup.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email address already in use by another user.',
          errors: ['Email collision'],
        });
      }
      params.push(email.trim());
      updates.push(`email = $${params.length}`);
    }

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      params.push(passwordHash);
      updates.push(`password_hash = $${params.length}`);
    }

    if (role_id) {
      const roleCheck = await db.query('SELECT id FROM roles WHERE id = $1', [role_id]);
      if (roleCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role ID.',
          errors: ['Role not found'],
        });
      }
      params.push(role_id);
      updates.push(`role_id = $${params.length}`);
    }

    if (is_active !== undefined) {
      // Prevent admin from deactivating themselves
      if (req.user.id === targetId && (is_active === false || is_active === 'false' || is_active === 0)) {
        return res.status(400).json({
          success: false,
          message: 'You cannot deactivate your own administrative account.',
          errors: ['Self-deactivation disallowed'],
        });
      }
      params.push(is_active === true || is_active === 'true' || is_active === 1);
      updates.push(`is_active = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No changes provided.',
        data: userRes.rows[0],
      });
    }

    params.push(targetId);
    const updateSql = `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING id, name, email, role_id, is_active, updated_at
    `;
    const result = await db.query(updateSql, params);

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const targetId = parseInt(req.params.id, 10);

    if (req.user.id === targetId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.',
        errors: ['Self-deactivation disallowed'],
      });
    }

    // Soft deactivation as required by Section 7.2
    const updateSql = `
      UPDATE users
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, is_active
    `;
    const result = await db.query(updateSql, [targetId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        errors: ['User does not exist'],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
