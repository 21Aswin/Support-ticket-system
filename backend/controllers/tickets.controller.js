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
    let template = '';

    const priorityImpact = {
      Low: 'Low operational impact. Minor inquiry or non-urgent setup task.',
      Medium: 'Moderate impediment to daily work. Standard technical remediation requested.',
      High: 'Significant disruption to productivity. Time-sensitive business tasks impeded.',
      Critical: 'Severe operational stoppage. Core systems or communication completely blocked.',
    }[priority] || 'Standard technical assistance requested.';

    if (catLower.includes('network') || catLower.includes('wi-fi') || catLower.includes('wifi') || catLower.includes('vpn') || trimmedTitle.toLowerCase().includes('wifi') || trimmedTitle.toLowerCase().includes('vpn') || trimmedTitle.toLowerCase().includes('network')) {
      template = `[Issue Summary]
${trimmedTitle}

[Category & Urgency]
- Issue Category: ${category || 'Network Issue'}
- Priority Level: ${priority}
- Business Impact: ${priorityImpact}

[Observed Symptoms]
- Primary Problem: ${trimmedTitle}
- Connectivity Status: Unable to establish a stable connection with the office network / gateway.
- Affected Systems: Workstation, corporate portals, and remote connectivity services.
- Frequency: Persistent during active office working hours.

[Troubleshooting Steps Attempted]
1. Toggled network adapter / Wi-Fi off and back on.
2. Verified physical cable connections and office access point signal.
3. Restarted workstation and attempted network reconnection.

[Workstation Environment]
- Operating System: Windows 11 Enterprise (Corporate Device)
- Connection Type: Corporate Wi-Fi / Local Subnet

[Requested IT Action]
Kindly check network access permissions, gateway routing, and DNS configuration for this device.`;
    } else if (catLower.includes('hardware') || catLower.includes('printer') || catLower.includes('laptop') || catLower.includes('monitor') || trimmedTitle.toLowerCase().includes('printer') || trimmedTitle.toLowerCase().includes('laptop') || trimmedTitle.toLowerCase().includes('monitor')) {
      template = `[Issue Summary]
${trimmedTitle}

[Category & Urgency]
- Issue Category: ${category || 'Hardware Issue'}
- Priority Level: ${priority}
- Business Impact: ${priorityImpact}

[Observed Symptoms]
- Primary Problem: ${trimmedTitle}
- Device Status: Equipment is malfunctioning, unresponsive, or displaying hardware warning.
- Occurrence: Started during normal daily use at office workspace.

[Troubleshooting Steps Attempted]
1. Checked power source, physical cables, and interface adapters (HDMI / USB-C / Power).
2. Performed a full power cycle of the workstation and peripheral equipment.
3. Tested alternative ports / cables with no change in behavior.

[Hardware Details]
- Equipment Type: Corporate Laptop / Monitor / Peripheral
- Physical Location: Assigned Office Workspace / Desk

[Requested IT Action]
Kindly inspect the hardware, replace faulty cables or components, or arrange hardware maintenance.`;
    } else if (catLower.includes('access') || catLower.includes('card') || catLower.includes('permission') || catLower.includes('login') || catLower.includes('account') || trimmedTitle.toLowerCase().includes('access') || trimmedTitle.toLowerCase().includes('permission') || trimmedTitle.toLowerCase().includes('card')) {
      template = `[Issue Summary]
${trimmedTitle}

[Category & Urgency]
- Issue Category: ${category || 'Access Request'}
- Priority Level: ${priority}
- Business Impact: ${priorityImpact}

[Access Request Details]
- Target Resource / System: ${trimmedTitle}
- Requested Role / Permission: Standard User Access / Read & Write Permissions
- Business Justification: Required to fulfill primary daily project duties and team workflows.

[Requester Details]
- Requester: ${req.user ? req.user.name : 'Authorized Employee'}
- Email: ${req.user ? req.user.email : 'employee@helpdesk.local'}
- Department / Role: ${req.user ? req.user.role : 'Employee'}

[Requested IT Action]
Please review access approval and provision the appropriate account credentials or security badge activation.`;
    } else if (catLower.includes('email') || catLower.includes('outlook') || catLower.includes('mailbox') || trimmedTitle.toLowerCase().includes('email') || trimmedTitle.toLowerCase().includes('mail') || trimmedTitle.toLowerCase().includes('outlook')) {
      template = `[Issue Summary]
${trimmedTitle}

[Category & Urgency]
- Issue Category: ${category || 'Email Issue'}
- Priority Level: ${priority}
- Business Impact: ${priorityImpact}

[Observed Symptoms]
- Primary Problem: ${trimmedTitle}
- Mail Client: Microsoft Outlook / Webmail Portal
- Behavior: Experiencing delivery delays, mailbox synchronization faults, or credential prompts.

[Troubleshooting Steps Attempted]
1. Verified active internet connection and browser access.
2. Restarted the email client and tested login via webmail portal.
3. Checked mailbox storage quota and outgoing folder status.

[Requested IT Action]
Please inspect mailbox server status, account synchronization, and corporate email routing.`;
    } else if (catLower.includes('software') || catLower.includes('app') || catLower.includes('install') || trimmedTitle.toLowerCase().includes('software') || trimmedTitle.toLowerCase().includes('install')) {
      template = `[Issue Summary]
${trimmedTitle}

[Category & Urgency]
- Issue Category: ${category || 'Software Issue'}
- Priority Level: ${priority}
- Business Impact: ${priorityImpact}

[Observed Symptoms]
- Application / Component: ${trimmedTitle}
- Problem Details: Software fails to launch, crashes unexpectedly, or requires administrative privileges to install.
- Frequency: Persistent upon launch or installation attempt.

[Troubleshooting Steps Attempted]
1. Terminated background processes and relaunched application.
2. Verified system requirements and checked for pending OS updates.
3. Attempted standard installation wizard (blocked by administrative policy).

[Workstation Environment]
- Operating System: Windows 11 Enterprise 64-bit

[Requested IT Action]
Kindly assist with software deployment, licensing verification, or troubleshooting application errors.`;
    } else {
      template = `[Issue Summary]
${trimmedTitle}

[Category & Urgency]
- Issue Category: ${category || 'General Support'}
- Priority Level: ${priority}
- Business Impact: ${priorityImpact}

[Detailed Description]
- Technical Issue: ${trimmedTitle}
- Operational Impact: Work disruption encountered during routine daily workflows.
- Frequency: Recurring issue requiring IT support investigation.

[Troubleshooting Steps Attempted]
1. Restarted affected application and workstation.
2. Verified standard user configuration and network connections.

[Requested IT Action]
Please investigate this support ticket and assist with technical diagnosis and resolution.`;
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
