const db = require('../config/database');

/**
 * Creates a notification record for a user
 * @param {import('pg').PoolClient|object} clientOrDb
 * @param {object} param1
 */
async function createNotification(clientOrDb, { user_id, ticket_id = null, type, title, message }) {
  const query = typeof clientOrDb.query === 'function' ? clientOrDb.query.bind(clientOrDb) : db.query.bind(db);

  const sql = `
    INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
    VALUES ($1, $2, $3, $4, $5, FALSE, NOW())
    RETURNING *;
  `;
  const result = await query(sql, [user_id, ticket_id, type, title.trim(), message.trim()]);
  return result.rows[0];
}

/**
 * Retrieves notifications for a specific user
 */
async function getUserNotifications(userId, { unread_only = false, limit = 50, offset = 0 } = {}) {
  const conditions = ['n.user_id = $1'];
  const params = [userId];

  if (unread_only === 'true' || unread_only === true) {
    conditions.push('n.is_read = FALSE');
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const sql = `
    SELECT n.id, n.user_id, n.ticket_id, n.type, n.title, n.message, n.is_read, n.created_at,
           t.ticket_number, t.status as ticket_status, t.priority as ticket_priority
    FROM notifications n
    LEFT JOIN tickets t ON n.ticket_id = t.id
    ${whereClause}
    ORDER BY n.created_at DESC
    LIMIT $2 OFFSET $3;
  `;

  params.push(parseInt(limit, 10));
  params.push(parseInt(offset, 10));

  const result = await db.query(sql, params);

  // Get total unread count for user
  const countRes = await db.query(
    'SELECT COUNT(*)::int as unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );

  return {
    notifications: result.rows,
    unread_count: countRes.rows[0].unread_count,
  };
}

/**
 * Get just the unread count for a user
 */
async function getUnreadCount(userId) {
  const result = await db.query(
    'SELECT COUNT(*)::int as unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return result.rows[0].unread_count || 0;
}

/**
 * Mark a single notification as read
 */
async function markAsRead(notificationId, userId) {
  const sql = `
    UPDATE notifications
    SET is_read = TRUE
    WHERE id = $1 AND user_id = $2
    RETURNING *;
  `;
  const result = await db.query(sql, [notificationId, userId]);
  if (result.rows.length === 0) {
    const err = new Error('Notification not found or access denied.');
    err.status = 404;
    throw err;
  }

  const unreadCount = await getUnreadCount(userId);
  return {
    notification: result.rows[0],
    unread_count: unreadCount,
  };
}

/**
 * Mark all notifications as read for a user
 */
async function markAllAsRead(userId) {
  await db.query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return {
    unread_count: 0,
  };
}

/**
 * Mark all notifications for a specific ticket as read for a user
 */
async function markTicketNotificationsAsRead(ticketId, userId) {
  await db.query(
    'UPDATE notifications SET is_read = TRUE WHERE ticket_id = $1 AND user_id = $2 AND is_read = FALSE',
    [ticketId, userId]
  );
  const unreadCount = await getUnreadCount(userId);
  return {
    unread_count: unreadCount,
  };
}

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markTicketNotificationsAsRead,
};
