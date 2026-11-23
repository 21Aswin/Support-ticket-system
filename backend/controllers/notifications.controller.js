const notificationService = require('../services/notification.service');

async function list(req, res, next) {
  try {
    const { unread_only, limit, offset } = req.query;
    const result = await notificationService.getUserNotifications(req.user.id, {
      unread_only,
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: result.notifications,
      meta: {
        unread_count: result.unread_count,
        total: result.notifications.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: {
        unread_count: count,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const notificationId = req.params.id;
    const result = await notificationService.markAsRead(notificationId, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function markTicketAsRead(req, res, next) {
  try {
    const ticketId = req.params.ticketId;
    const result = await notificationService.markTicketNotificationsAsRead(ticketId, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Ticket notifications marked as read',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markTicketAsRead,
};
