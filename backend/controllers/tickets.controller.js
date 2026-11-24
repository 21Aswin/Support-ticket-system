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

async function generateDescription(req, res, next) {
  try {
    const { title = '', category = '', priority = 'Medium' } = req.body;
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an issue title to generate a description.',
      });
    }

    const catLower = (category || '').toLowerCase();
    const titleLower = trimmedTitle.toLowerCase();
    const userName = (req.user && req.user.name) ? req.user.name : 'Authorized Employee';

    const urgencyNote = {
      Critical: 'Since this is completely halting my daily work activities, your urgent assistance would be greatly appreciated.',
      High: 'As this is causing significant delays to my time-sensitive deliverables, a prompt resolution would be very helpful.',
      Medium: 'Please look into this issue and assist with remediation at your earliest convenience.',
      Low: 'Please inspect and assist whenever feasible.',
    }[priority] || 'Please assist with technical diagnosis and remediation.';

    let template = '';

    if (catLower.includes('network') || catLower.includes('wi-fi') || catLower.includes('wifi') || catLower.includes('vpn') || titleLower.includes('wifi') || titleLower.includes('vpn') || titleLower.includes('network')) {
      template = `Hi Team,

I am writing to report a network connectivity issue regarding "${trimmedTitle}". Currently, my workstation is experiencing persistent connection drops with the office network, which is preventing me from accessing corporate portals and internal company tools.

I have already tried restarting my laptop, toggling the Wi-Fi adapter off and on, and checking the office network connections, but the problem continues. Could you please check the network access permissions, gateway routing, and DNS settings for my device?

${urgencyNote}

Thanks & regards,
${userName}`;
    } else if (catLower.includes('hardware') || catLower.includes('printer') || catLower.includes('laptop') || catLower.includes('monitor') || titleLower.includes('printer') || titleLower.includes('laptop') || titleLower.includes('monitor') || titleLower.includes('mouse') || titleLower.includes('keyboard')) {
      template = `Hi Team,

I am reaching out to report a hardware problem regarding "${trimmedTitle}". My equipment is malfunctioning during normal office hours, making it difficult to complete my assigned tasks effectively.

I have already inspected all physical cables and power connections, tested alternative display ports, and performed a full restart of the hardware, but the issue remains unresolved. Could you please arrange for an IT support technician to inspect the device, repair the faulty component, or advise on a replacement?

${urgencyNote}

Thanks & regards,
${userName}`;
    } else if (catLower.includes('access') || catLower.includes('card') || catLower.includes('permission') || catLower.includes('login') || catLower.includes('account') || titleLower.includes('access') || titleLower.includes('permission') || titleLower.includes('card') || titleLower.includes('login') || titleLower.includes('password')) {
      template = `Hi Team,

I would like to request system access permissions regarding "${trimmedTitle}". I require standard access rights and credentials for this system to fulfill my daily project responsibilities and team workflows.

Could you please review my access request, verify my permissions, and provision the required account credentials or security clearance for my profile?

${urgencyNote}

Thank you for your assistance,
${userName}`;
    } else if (catLower.includes('email') || catLower.includes('outlook') || catLower.includes('mailbox') || titleLower.includes('email') || titleLower.includes('mail') || titleLower.includes('outlook')) {
      template = `Hi Team,

I am experiencing an issue with my corporate email account regarding "${trimmedTitle}". I am unable to reliably send or receive messages, and Microsoft Outlook is encountering synchronization delays and repeated credential prompts.

I have already confirmed that my internet connection is working, restarted the email application, and tried logging in via the webmail portal, but the synchronization problem persists. Could you please check my mailbox server status, storage quota, and account routing?

${urgencyNote}

Thanks & regards,
${userName}`;
    } else if (catLower.includes('software') || catLower.includes('app') || catLower.includes('install') || titleLower.includes('software') || titleLower.includes('install') || titleLower.includes('crash')) {
      template = `Hi Team,

I am encountering an issue with software application regarding "${trimmedTitle}". The application is either crashing unexpectedly during usage, failing to launch properly, or prompting for administrator privileges to proceed with installation or updates.

I have already attempted closing conflicting background processes, restarting the application, and rebooting my system, but the error continues. Could you please assist with troubleshooting this software error, verifying licensing, or providing the necessary administrative permissions?

${urgencyNote}

Thanks & regards,
${userName}`;
    } else {
      template = `Hi Team,

I am writing to report a technical support issue regarding "${trimmedTitle}". This issue is disrupting my routine workflow and preventing me from completing my daily tasks efficiently.

I have already restarted the affected application and verified my standard workstation settings, but the problem continues to occur. Could you please look into this matter and assist with technical diagnosis and resolution?

${urgencyNote}

Thanks & regards,
${userName}`;
    }

    return res.status(200).json({
      success: true,
      message: 'AI description generated successfully',
      data: {
        description: template,
      },
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
  generateDescription,
};
