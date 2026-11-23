/**
 * Global Centralized Error Handling Middleware
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[API Error]', err);

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A duplicate record already exists.',
      errors: [err.detail || 'Unique constraint violation'],
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced entity does not exist.',
      errors: [err.detail || 'Foreign key constraint violation'],
    });
  }

  // PostgreSQL check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Input does not meet requirements.',
      errors: [err.detail || 'Check constraint violation'],
    });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(status).json({
    success: false,
    message: message,
    errors: err.errors || [message],
  });
}

module.exports = { errorHandler };
