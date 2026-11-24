const db = require('../config/database');
const ticketService = require('../services/ticket.service');

async function getComments(req, res, next) {
  try {
    const ticketId = req.params.id;
    // Check permission to access ticket
    await ticketService.getTicketById(ticketId, req.user);

    const sql = `
      SELECT tc.id, tc.ticket_id, tc.user_id, tc.comment, tc.created_at,
             u.name as user_name, u.email as user_email, r.name as user_role
      FROM ticket_comments tc
      JOIN users u ON tc.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE tc.ticket_id = $1
      ORDER BY tc.created_at ASC
    `;
    const result = await db.query(sql, [ticketId]);

    return res.status(200).json({
      success: true,
      message: 'Comments retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function addComment(req, res, next) {
  try {
    const ticketId = req.params.id;
    const { comment } = req.body;

    if (!comment || comment.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment text cannot be empty.',
        errors: ['Missing comment body'],
      });
    }

    // Check permission
    const ticket = await ticketService.getTicketById(ticketId, req.user);

    // Cannot add comment on closed tickets
    if (ticket.status === 'Closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot comment on a closed ticket. Please reopen it first.',
        errors: ['Ticket is closed'],
      });
    }

    const insertSql = `
      INSERT INTO ticket_comments (ticket_id, user_id, comment, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    const result = await db.query(insertSql, [ticketId, req.user.id, comment.trim()]);
    const newComment = result.rows[0];

    // Record comment event in history
    await db.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, old_value, new_value, details, created_at)
       VALUES ($1, $2, 'COMMENT', NULL, NULL, $3, NOW())`,
      [ticketId, req.user.id, `Comment posted by ${req.user.name}`]
    );

    // Notify ticket creator if someone else commented
    if (ticket.created_by && ticket.created_by !== req.user.id) {
      await db.query(
        `INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
         VALUES ($1, $2, 'COMMENT', $3, $4, FALSE, NOW())`,
        [
          ticket.created_by,
          ticket.id,
          `New Comment: ${ticket.ticket_number}`,
          `${req.user.name} added a comment on your ticket '${ticket.title}'.`,
        ]
      );
    }

    // Notify assigned staff if commenter is someone else
    if (ticket.assigned_to && ticket.assigned_to !== req.user.id) {
      await db.query(
        `INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
         VALUES ($1, $2, 'COMMENT', $3, $4, FALSE, NOW())`,
        [
          ticket.assigned_to,
          ticket.id,
          `New Comment: ${ticket.ticket_number}`,
          `${req.user.name} added a comment on ticket '${ticket.title}'.`,
        ]
      );
    }

    // If ticket has no assigned staff, notify active Admins about the comment
    if (!ticket.assigned_to) {
      const adminUsersRes = await db.query(
        `SELECT u.id FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE r.name = 'Admin' AND u.is_active = TRUE`
      );
      for (const admin of adminUsersRes.rows) {
        if (admin.id !== req.user.id) {
          await db.query(
            `INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
             VALUES ($1, $2, 'COMMENT', $3, $4, FALSE, NOW())`,
            [
              admin.id,
              ticket.id,
              `New Comment on Unassigned Ticket: ${ticket.ticket_number}`,
              `${req.user.name} added a comment on '${ticket.title}'.`,
            ]
          );
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        ...newComment,
        user_name: req.user.name,
        user_email: req.user.email,
        user_role: req.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const ticketId = req.params.id;
    // Check permission
    await ticketService.getTicketById(ticketId, req.user);

    const sql = `
      SELECT th.id, th.ticket_id, th.actor_id, th.action, th.old_value, th.new_value, th.details, th.created_at,
             u.name as actor_name, r.name as actor_role
      FROM ticket_history th
      JOIN users u ON th.actor_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE th.ticket_id = $1
      ORDER BY th.created_at ASC
    `;
    const result = await db.query(sql, [ticketId]);

    return res.status(200).json({
      success: true,
      message: 'Ticket history retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getComments,
  addComment,
  getHistory,
};
