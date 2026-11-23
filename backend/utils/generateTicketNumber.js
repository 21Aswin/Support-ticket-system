/**
 * Generates a unique, sequential ticket number formatted as HD-XXXXX
 * @param {import('pg').PoolClient} client - Optional active transaction client
 * @param {Function} queryFn - Database query function
 * @returns {Promise<string>} e.g. "HD-00107"
 */
async function generateTicketNumber(clientOrQuery) {
  const query = typeof clientOrQuery.query === 'function' 
    ? clientOrQuery.query.bind(clientOrQuery) 
    : clientOrQuery;

  const res = await query('SELECT MAX(id) AS max_id FROM tickets');
  const maxId = parseInt(res.rows[0].max_id || 0, 10);
  const nextNumber = maxId + 1;
  const baseNumber = 'HD-' + String(nextNumber).padStart(5, '0');

  // Verify uniqueness just in case
  const exists = await query('SELECT 1 FROM tickets WHERE ticket_number = $1', [baseNumber]);
  if (exists.rows.length === 0) {
    return baseNumber;
  }

  // Fallback with random entropy if collisions occur
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `HD-${String(nextNumber).padStart(4, '0')}-${randomSuffix}`;
}

module.exports = { generateTicketNumber };
