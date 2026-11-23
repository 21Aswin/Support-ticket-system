const db = require('../config/database');
const { generateTicketNumber } = require('../utils/generateTicketNumber');

const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const VALID_STATUSES = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Reopened'];

/**
 * Validates whether a status transition is permitted and whether the actor is authorized.
 */
function validateStatusTransition(currentStatus, nextStatus, ticket, actor) {
  if (!VALID_STATUSES.includes(nextStatus)) {
    const err = new Error(`Invalid status '${nextStatus}'.`);
    err.status = 400;
    throw err;
  }

  if (currentStatus === nextStatus) {
    const err = new Error(`Ticket is already in '${currentStatus}' status.`);
    err.status = 400;
    throw err;
  }

  const role = actor.role;
  const isCreator = actor.id === ticket.created_by;
  const isAssignee = actor.id === ticket.assigned_to;
  const isAdmin = role === 'Admin';

  const transitions = {
    'Open': {
      'Assigned': () => isAdmin,
    },
    'Assigned': {
      'In Progress': () => isAssignee || isAdmin,
    },
    'In Progress': {
      'Resolved': () => isAssignee || isAdmin,
    },
    'Resolved': {
      'Closed': () => isCreator || isAdmin,
      'Reopened': () => isCreator || isAdmin,
    },
    'Reopened': {
      'Assigned': () => isAdmin,
      'In Progress': () => isAssignee || isAdmin,
    },
    'Closed': {
      // Once closed, cannot directly change without administrative reopening policy if needed
    },
  };

  const allowedNext = transitions[currentStatus];
  if (!allowedNext || !allowedNext[nextStatus]) {
    const validNextList = allowedNext ? Object.keys(allowedNext).join(', ') : 'none';
    const err = new Error(
      `Status transition from '${currentStatus}' to '${nextStatus}' is not allowed. Permitted next status(es): ${validNextList || 'none'}.`
    );
    err.status = 409;
    throw err;
  }

  const isActorAuthorized = allowedNext[nextStatus]();
  if (!isActorAuthorized) {
    let errMessage = 'You do not have permission to perform this status change.';
    if (nextStatus === 'In Progress' || nextStatus === 'Resolved') {
      errMessage = 'Only the assigned Support Staff member (or Admin) can update this ticket to ' + nextStatus + '.';
    } else if (nextStatus === 'Closed' || nextStatus === 'Reopened') {
      errMessage = 'Only the ticket requester (or Admin) can close or reopen this ticket.';
    }
    const err = new Error(errMessage);
    err.status = 403;
    throw err;
  }
}

/**
 * Creates a new ticket in a transaction.
 */
async function createTicket({ title, description, category_id, priority = 'Medium' }, actor) {
  if (!title || !description || !category_id) {
    const err = new Error('Title, description, and category are required.');
    err.status = 400;
    throw err;
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    const err = new Error(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}.`);
    err.status = 400;
    throw err;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Verify category exists and is active
    const catRes = await client.query(
      'SELECT id, name, is_active FROM ticket_categories WHERE id = $1',
      [category_id]
    );
    if (catRes.rows.length === 0 || !catRes.rows[0].is_active) {
      const err = new Error('Selected category does not exist or is inactive.');
      err.status = 400;
      throw err;
    }

    const ticketNumber = await generateTicketNumber(client);

    const insertTicketSql = `
      INSERT INTO tickets (ticket_number, title, description, category_id, created_by, priority, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'Open', NOW(), NOW())
      RETURNING *;
    `;
    const ticketRes = await client.query(insertTicketSql, [
      ticketNumber,
      title.trim(),
      description.trim(),
      category_id,
      actor.id,
      priority,
    ]);
    const ticket = ticketRes.rows[0];

    // Record creation history
    await client.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, old_value, new_value, details, created_at)
       VALUES ($1, $2, 'CREATED', NULL, 'Open', $3, NOW())`,
      [ticket.id, actor.id, `Ticket created with priority ${priority}`]
    );

    await client.query('COMMIT');

    return {
      ...ticket,
      category_name: catRes.rows[0].name,
      creator_name: actor.name,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Lists tickets scoped by actor role and query filters.
 */
async function listTickets(actor, filters = {}) {
  const { status, priority, category_id, search, limit = 50, offset = 0 } = filters;
  const conditions = [];
  const params = [];

  // Scoping by role
  if (actor.role === 'Employee') {
    params.push(actor.id);
    conditions.push(`t.created_by = $${params.length}`);
  } else if (actor.role === 'Support Staff') {
    params.push(actor.id);
    conditions.push(`t.assigned_to = $${params.length}`);
  } // Admin sees all tickets

  // Optional filters
  if (status) {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }

  if (priority) {
    params.push(priority);
    conditions.push(`t.priority = $${params.length}`);
  }

  if (category_id) {
    params.push(category_id);
    conditions.push(`t.category_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search.trim()}%`);
    const pIdx = params.length;
    conditions.push(`(t.ticket_number ILIKE $${pIdx} OR t.title ILIKE $${pIdx} OR t.description ILIKE $${pIdx})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      t.id, t.ticket_number, t.title, t.description, t.priority, t.status,
      t.resolution, t.created_at, t.updated_at, t.resolved_at, t.closed_at,
      c.id as category_id, c.name as category_name,
      u_creator.id as created_by, u_creator.name as requester_name, u_creator.email as requester_email,
      u_assignee.id as assigned_to, u_assignee.name as assigned_name, u_assignee.email as assigned_email,
      (SELECT COUNT(*) FROM ticket_comments tc WHERE tc.ticket_id = t.id) as comments_count
    FROM tickets t
    JOIN ticket_categories c ON t.category_id = c.id
    JOIN users u_creator ON t.created_by = u_creator.id
    LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  params.push(parseInt(limit, 10));
  params.push(parseInt(offset, 10));

  const result = await db.query(sql, params);

  // Also get total count for pagination
  const countSql = `
    SELECT COUNT(*) as total
    FROM tickets t
    ${whereClause}
  `;
  const countRes = await db.query(countSql, params.slice(0, -2));

  return {
    tickets: result.rows,
    total: parseInt(countRes.rows[0].total, 10),
  };
}

/**
 * Gets detailed information for a single ticket with ownership verification.
 */
async function getTicketById(ticketId, actor) {
  const sql = `
    SELECT 
      t.id, t.ticket_number, t.title, t.description, t.priority, t.status,
      t.resolution, t.created_at, t.updated_at, t.resolved_at, t.closed_at,
      c.id as category_id, c.name as category_name,
      u_creator.id as created_by, u_creator.name as requester_name, u_creator.email as requester_email,
      u_assignee.id as assigned_to, u_assignee.name as assigned_name, u_assignee.email as assigned_email
    FROM tickets t
    JOIN ticket_categories c ON t.category_id = c.id
    JOIN users u_creator ON t.created_by = u_creator.id
    LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
    WHERE t.id = $1
  `;
  const res = await db.query(sql, [ticketId]);

  if (res.rows.length === 0) {
    const err = new Error('Ticket not found.');
    err.status = 404;
    throw err;
  }

  const ticket = res.rows[0];

  // Role ownership enforcement
  if (actor.role === 'Employee' && ticket.created_by !== actor.id) {
    const err = new Error('Access denied. You can only view your own tickets.');
    err.status = 403;
    throw err;
  }

  if (actor.role === 'Support Staff' && ticket.assigned_to !== actor.id) {
    const err = new Error('Access denied. You can only view tickets assigned to you.');
    err.status = 403;
    throw err;
  }

  return ticket;
}

/**
 * Updates status of a ticket adhering strictly to allowed workflow transitions.
 */
async function updateTicketStatus(ticketId, nextStatus, { resolution, reason }, actor) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const ticketRes = await client.query(
      'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
      [ticketId]
    );

    if (ticketRes.rows.length === 0) {
      const err = new Error('Ticket not found.');
      err.status = 404;
      throw err;
    }

    const ticket = ticketRes.rows[0];

    // Validate workflow transition and actor authorization
    validateStatusTransition(ticket.status, nextStatus, ticket, actor);

    // If transitioning to Resolved, resolution notes are required
    if (nextStatus === 'Resolved' && (!resolution || resolution.trim() === '')) {
      const err = new Error('Resolution summary is required when marking a ticket as Resolved.');
      err.status = 400;
      throw err;
    }

    let resolvedAt = ticket.resolved_at;
    let closedAt = ticket.closed_at;
    let currentResolution = ticket.resolution;

    if (nextStatus === 'Resolved') {
      resolvedAt = new Date();
      currentResolution = resolution.trim();
    } else if (nextStatus === 'Closed') {
      closedAt = new Date();
    } else if (nextStatus === 'Reopened') {
      resolvedAt = null;
      closedAt = null;
    }

    // Update ticket
    await client.query(
      `UPDATE tickets
       SET status = $1,
           resolution = $2,
           resolved_at = $3,
           closed_at = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [nextStatus, currentResolution, resolvedAt, closedAt, ticket.id]
    );

    // Prepare details message
    let historyDetails = `Status changed from ${ticket.status} to ${nextStatus}`;
    if (nextStatus === 'Resolved') {
      historyDetails = `Resolved with note: ${currentResolution}`;
    } else if (nextStatus === 'Reopened' && reason) {
      historyDetails = `Reopened with reason: ${reason.trim()}`;
    }

    // Insert history record
    await client.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, old_value, new_value, details, created_at)
       VALUES ($1, $2, 'STATUS_CHANGE', $3, $4, $5, NOW())`,
      [ticket.id, actor.id, ticket.status, nextStatus, historyDetails]
    );

    await client.query('COMMIT');

    return {
      ticketId: ticket.id,
      ticket_number: ticket.ticket_number,
      old_status: ticket.status,
      new_status: nextStatus,
      resolution: currentResolution,
      updated_at: new Date(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Updates basic ticket fields (Admin or creator before assignment)
 */
async function updateTicket(ticketId, fields, actor) {
  const ticket = await getTicketById(ticketId, actor);

  if (actor.role === 'Employee' && ticket.status !== 'Open') {
    const err = new Error('Employees can only modify tickets while in Open status.');
    err.status = 403;
    throw err;
  }

  const updates = [];
  const params = [];

  if (fields.title) {
    params.push(fields.title.trim());
    updates.push(`title = $${params.length}`);
  }

  if (fields.description) {
    params.push(fields.description.trim());
    updates.push(`description = $${params.length}`);
  }

  if (fields.priority) {
    if (!VALID_PRIORITIES.includes(fields.priority)) {
      const err = new Error(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}.`);
      err.status = 400;
      throw err;
    }
    // Only Admin can change priority after Open
    if (actor.role !== 'Admin' && ticket.status !== 'Open') {
      const err = new Error('Only administrators can change priority on an assigned or active ticket.');
      err.status = 403;
      throw err;
    }
    params.push(fields.priority);
    updates.push(`priority = $${params.length}`);
  }

  if (fields.category_id) {
    params.push(fields.category_id);
    updates.push(`category_id = $${params.length}`);
  }

  if (updates.length === 0) {
    return ticket;
  }

  params.push(ticketId);
  const sql = `
    UPDATE tickets
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $${params.length}
    RETURNING *;
  `;

  const res = await db.query(sql, params);
  return res.rows[0];
}

module.exports = {
  createTicket,
  listTickets,
  getTicketById,
  updateTicketStatus,
  updateTicket,
  VALID_PRIORITIES,
  VALID_STATUSES,
};
