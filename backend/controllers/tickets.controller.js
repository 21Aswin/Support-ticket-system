const ticketService = require('../services/ticket.service');
const assignmentService = require('../services/assignment.service');

async function create(req, res, next) {
  try {
    const { title, description, category_id, priority } = req.body;
    const ticket = await ticketService.createTicket(
      { title, description, category_id, priority },
      req.user
    );

    return res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const { status, priority, category_id, search, limit, offset } = req.query;
    const result = await ticketService.listTickets(req.user, {
      status,
      priority,
      category_id,
      search,
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      message: 'Tickets retrieved successfully',
      data: result.tickets,
      meta: {
        total: result.total,
        limit: parseInt(limit || 50, 10),
        offset: parseInt(offset || 0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const ticketId = req.params.id;
    const ticket = await ticketService.getTicketById(ticketId, req.user);

    return res.status(200).json({
      success: true,
      message: 'Ticket details retrieved successfully',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const ticketId = req.params.id;
    const updated = await ticketService.updateTicket(ticketId, req.body, req.user);

    return res.status(200).json({
      success: true,
      message: 'Ticket updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const ticketId = req.params.id;
    const { status, resolution, reason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status field is required.',
        errors: ['Missing status'],
      });
    }

    const result = await ticketService.updateTicketStatus(
      ticketId,
      status,
      { resolution, reason },
      req.user
    );

    return res.status(200).json({
      success: true,
      message: `Ticket status successfully updated to '${status}'.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function assign(req, res, next) {
  try {
    const ticketId = req.params.id;
    const { assigned_to } = req.body;

    if (!assigned_to) {
      return res.status(400).json({
        success: false,
        message: 'assigned_to user ID is required.',
        errors: ['Missing assignee'],
      });
    }

    const result = await assignmentService.assignTicket(
      ticketId,
      assigned_to,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: `Ticket assigned to ${result.assignee_name} successfully.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  updateStatus,
  assign,
};
