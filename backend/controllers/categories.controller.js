const db = require('../config/database');

async function listCategories(req, res, next) {
  try {
    const { active_only } = req.query;
    let sql = 'SELECT * FROM ticket_categories';
    const params = [];

    if (active_only === 'true' || req.user.role !== 'Admin') {
      sql += ' WHERE is_active = TRUE';
    }

    sql += ' ORDER BY name ASC';
    const result = await db.query(sql, params);

    return res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.',
        errors: ['Missing category name'],
      });
    }

    // Check collision
    const existing = await db.query(
      'SELECT id FROM ticket_categories WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists.',
        errors: ['Category name conflict'],
      });
    }

    const sql = `
      INSERT INTO ticket_categories (name, is_active, created_at)
      VALUES ($1, TRUE, NOW())
      RETURNING *
    `;
    const result = await db.query(sql, [name.trim()]);

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.',
        errors: ['Missing category name'],
      });
    }

    // Check collision
    const dup = await db.query(
      'SELECT id FROM ticket_categories WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists.',
        errors: ['Category name conflict'],
      });
    }

    const sql = `
      UPDATE ticket_categories
      SET name = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(sql, [name.trim(), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
        errors: ['Category does not exist'],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({
        success: false,
        message: 'is_active field is required.',
        errors: ['Missing active flag'],
      });
    }

    const activeBool = is_active === true || is_active === 'true' || is_active === 1;

    const sql = `
      UPDATE ticket_categories
      SET is_active = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(sql, [activeBool, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
        errors: ['Category does not exist'],
      });
    }

    return res.status(200).json({
      success: true,
      message: `Category ${activeBool ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  updateStatus,
};
