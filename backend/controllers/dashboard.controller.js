const db = require('../config/database');

async function getStats(req, res, next) {
  try {
    const actor = req.user;

    if (actor.role === 'Admin') {
      // 1. Ticket status counts
      const statusCountsRes = await db.query(`
        SELECT status, COUNT(*)::int as count
        FROM tickets
        GROUP BY status
      `);

      const statusMap = {
        'Open': 0,
        'Assigned': 0,
        'In Progress': 0,
        'Resolved': 0,
        'Closed': 0,
        'Reopened': 0,
      };
      let totalTickets = 0;
      statusCountsRes.rows.forEach(r => {
        statusMap[r.status] = r.count;
        totalTickets += r.count;
      });

      // 2. Priority counts
      const priorityCountsRes = await db.query(`
        SELECT priority, COUNT(*)::int as count
        FROM tickets
        GROUP BY priority
      `);
      const priorityMap = { 'Low': 0, 'Medium': 0, 'High': 0, 'Critical': 0 };
      priorityCountsRes.rows.forEach(r => {
        priorityMap[r.priority] = r.count;
      });

      // 3. Category breakdown
      const categoryCountsRes = await db.query(`
        SELECT c.name as category_name, COUNT(t.id)::int as count
        FROM ticket_categories c
        LEFT JOIN tickets t ON t.category_id = c.id
        GROUP BY c.id, c.name
        ORDER BY count DESC
      `);

      // 4. User counts by role
      const userCountsRes = await db.query(`
        SELECT r.name as role_name, COUNT(u.id)::int as count
        FROM roles r
        LEFT JOIN users u ON u.role_id = r.id AND u.is_active = TRUE
        GROUP BY r.name
      `);
      const userMap = { 'Admin': 0, 'Support Staff': 0, 'Employee': 0 };
      userCountsRes.rows.forEach(r => {
        userMap[r.role_name] = r.count;
      });

      // 5. Support staff workload
      const staffWorkloadRes = await db.query(`
        SELECT u.id, u.name, u.email,
               COUNT(t.id) FILTER (WHERE t.status IN ('Assigned', 'In Progress'))::int as active_tickets,
               COUNT(t.id) FILTER (WHERE t.status = 'Resolved')::int as resolved_tickets,
               COUNT(t.id)::int as total_tickets
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN tickets t ON t.assigned_to = u.id
        WHERE r.name = 'Support Staff' AND u.is_active = TRUE
        GROUP BY u.id, u.name, u.email
        ORDER BY active_tickets DESC
      `);

      return res.status(200).json({
        success: true,
        message: 'Admin dashboard statistics retrieved successfully',
        data: {
          total_tickets: totalTickets,
          open_tickets: statusMap['Open'],
          assigned_tickets: statusMap['Assigned'],
          in_progress_tickets: statusMap['In Progress'],
          resolved_tickets: statusMap['Resolved'],
          closed_tickets: statusMap['Closed'],
          reopened_tickets: statusMap['Reopened'],
          employees_count: userMap['Employee'],
          support_staff_count: userMap['Support Staff'],
          status_breakdown: statusMap,
          priority_breakdown: priorityMap,
          category_breakdown: categoryCountsRes.rows,
          staff_workload: staffWorkloadRes.rows,
        },
      });
    }

    if (actor.role === 'Support Staff') {
      const statsRes = await db.query(`
        SELECT
          COUNT(*)::int as total_assigned,
          COUNT(*) FILTER (WHERE status = 'Assigned')::int as assigned_count,
          COUNT(*) FILTER (WHERE status = 'In Progress')::int as in_progress_count,
          COUNT(*) FILTER (WHERE status = 'Resolved')::int as resolved_count,
          COUNT(*) FILTER (WHERE priority IN ('High', 'Critical'))::int as high_critical_count
        FROM tickets
        WHERE assigned_to = $1
      `, [actor.id]);

      const priorityRes = await db.query(`
        SELECT priority, COUNT(*)::int as count
        FROM tickets
        WHERE assigned_to = $1
        GROUP BY priority
      `, [actor.id]);

      const priorityMap = { 'Low': 0, 'Medium': 0, 'High': 0, 'Critical': 0 };
      priorityRes.rows.forEach(r => {
        priorityMap[r.priority] = r.count;
      });

      return res.status(200).json({
        success: true,
        message: 'Support staff statistics retrieved successfully',
        data: {
          ...statsRes.rows[0],
          priority_breakdown: priorityMap,
        },
      });
    }

    if (actor.role === 'Employee') {
      const statsRes = await db.query(`
        SELECT
          COUNT(*)::int as total_own_tickets,
          COUNT(*) FILTER (WHERE status = 'Open')::int as open_count,
          COUNT(*) FILTER (WHERE status = 'In Progress' OR status = 'Assigned')::int as in_progress_count,
          COUNT(*) FILTER (WHERE status = 'Resolved')::int as resolved_count,
          COUNT(*) FILTER (WHERE status = 'Closed')::int as closed_count
        FROM tickets
        WHERE created_by = $1
      `, [actor.id]);

      return res.status(200).json({
        success: true,
        message: 'Employee statistics retrieved successfully',
        data: statsRes.rows[0],
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Unknown role.',
    });
  } catch (error) {
    next(error);
  }
}

async function getRecentTickets(req, res, next) {
  try {
    const actor = req.user;
    const conditions = [];
    const params = [];

    if (actor.role === 'Employee') {
      params.push(actor.id);
      conditions.push(`t.created_by = $${params.length}`);
    } else if (actor.role === 'Support Staff') {
      params.push(actor.id);
      conditions.push(`t.assigned_to = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        t.id, t.ticket_number, t.title, t.priority, t.status, t.created_at, t.updated_at,
        c.name as category_name,
        u_creator.name as requester_name,
        u_assignee.name as assigned_name
      FROM tickets t
      JOIN ticket_categories c ON t.category_id = c.id
      JOIN users u_creator ON t.created_by = u_creator.id
      LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT 10
    `;
    const result = await db.query(sql, params);

    return res.status(200).json({
      success: true,
      message: 'Recent tickets retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStats,
  getRecentTickets,
};
