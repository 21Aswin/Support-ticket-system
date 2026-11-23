const db = require('../config/database');

/**
 * Assigns or reassigns a ticket to a support staff member inside a transaction.
 * @param {number|string} ticketId 
 * @param {number|string} targetUserId 
 * @param {object} actor - { id, name, role }
 */
async function assignTicket(ticketId, targetUserId, actor) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Fetch ticket with lock (locking only tickets table)
    const ticketRes = await client.query(
      `SELECT * FROM tickets WHERE id = $1 FOR UPDATE`,
      [ticketId]
    );

    if (ticketRes.rows.length === 0) {
      const err = new Error('Ticket not found.');
      err.status = 404;
      throw err;
    }

    const ticket = ticketRes.rows[0];

    // Cannot reassign Closed ticket unless reopened
    if (ticket.status === 'Closed') {
      const err = new Error('Cannot assign a closed ticket. Please reopen it first.');
      err.status = 400;
      throw err;
    }

    // Lookup current assignee name if assigned
    let oldAssigneeName = 'Unassigned';
    if (ticket.assigned_to) {
      const prevAssigneeRes = await client.query('SELECT name FROM users WHERE id = $1', [ticket.assigned_to]);
      if (prevAssigneeRes.rows.length > 0) {
        oldAssigneeName = prevAssigneeRes.rows[0].name;
      }
    }

    // 2. Fetch and validate target user
    const userRes = await client.query(
      `SELECT u.id, u.name, u.is_active, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [targetUserId]
    );

    if (userRes.rows.length === 0) {
      const err = new Error('Target user does not exist.');
      err.status = 404;
      throw err;
    }

    const targetUser = userRes.rows[0];

    if (!targetUser.is_active) {
      const err = new Error('Cannot assign ticket to a deactivated user.');
      err.status = 400;
      throw err;
    }

    if (targetUser.role_name !== 'Support Staff') {
      const err = new Error('Tickets can only be assigned to users with the Support Staff role.');
      err.status = 400;
      throw err;
    }

    const newAssigneeName = targetUser.name;

    // Determine new status: if currently Open or Reopened, transition to Assigned
    let newStatus = ticket.status;
    let statusChanged = false;
    if (ticket.status === 'Open' || ticket.status === 'Reopened') {
      newStatus = 'Assigned';
      statusChanged = true;
    }

    // 3. Update ticket record
    await client.query(
      `UPDATE tickets
       SET assigned_to = $1,
           status = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [targetUser.id, newStatus, ticket.id]
    );

    // 4. Mark previous assignment as unassigned
    await client.query(
      `UPDATE ticket_assignments
       SET unassigned_at = NOW()
       WHERE ticket_id = $1 AND unassigned_at IS NULL`,
      [ticket.id]
    );

    // 5. Insert new ticket_assignments record
    await client.query(
      `INSERT INTO ticket_assignments (ticket_id, assigned_to, assigned_by, assigned_at)
       VALUES ($1, $2, $3, NOW())`,
      [ticket.id, targetUser.id, actor.id]
    );

    // 6. Record assignment in ticket_history
    await client.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, old_value, new_value, details, created_at)
       VALUES ($1, $2, 'ASSIGNED', $3, $4, $5, NOW())`,
      [
        ticket.id,
        actor.id,
        oldAssigneeName,
        newAssigneeName,
        `Assigned to ${newAssigneeName} by ${actor.name}${statusChanged ? ' (status set to Assigned)' : ''}`,
      ]
    );

    // 7. If status also changed from Open/Reopened, record status change history
    if (statusChanged) {
      await client.query(
        `INSERT INTO ticket_history (ticket_id, actor_id, action, old_value, new_value, details, created_at)
         VALUES ($1, $2, 'STATUS_CHANGE', $3, 'Assigned', $4, NOW())`,
        [
          ticket.id,
          actor.id,
          ticket.status,
          `Status automatically updated to Assigned upon staff allocation`,
        ]
      );
    }

    // 8. Create notifications for Support Staff and Employee
    await client.query(
      `INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
       VALUES ($1, $2, 'ASSIGNMENT', $3, $4, FALSE, NOW())`,
      [
        targetUser.id,
        ticket.id,
        `New Ticket Assigned: ${ticket.ticket_number}`,
        `You have been assigned to handle ticket '${ticket.title}' by ${actor.name}.`,
      ]
    );

    if (ticket.created_by && ticket.created_by !== actor.id) {
      await client.query(
        `INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
         VALUES ($1, $2, 'STATUS_CHANGE', $3, $4, FALSE, NOW())`,
        [
          ticket.created_by,
          ticket.id,
          `Ticket Update: ${ticket.ticket_number}`,
          `Your ticket '${ticket.title}' has been assigned to support specialist ${newAssigneeName}.`,
        ]
      );
    }

    await client.query('COMMIT');

    return {
      ticketId: ticket.id,
      ticket_number: ticket.ticket_number,
      assigned_to: targetUser.id,
      assignee_name: targetUser.name,
      status: newStatus,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { assignTicket };
