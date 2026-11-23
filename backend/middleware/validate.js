/**
 * Validation utility middleware and helper functions
 */

function validateBody(requiredFields = []) {
  return (req, res, next) => {
    const missing = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || String(req.body[field]).trim() === '') {
        missing.push(`${field} is required`);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed. Required fields are missing.',
        errors: missing,
      });
    }

    next();
  };
}

module.exports = { validateBody };
