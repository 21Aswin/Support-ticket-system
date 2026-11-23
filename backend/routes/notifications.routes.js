const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticate } = require('../middleware/authenticate');

router.use(authenticate);

router.get('/', notificationsController.list);
router.get('/unread-count', notificationsController.getUnreadCount);
router.patch('/read-all', notificationsController.markAllAsRead);
router.patch('/ticket/:ticketId/read', notificationsController.markTicketAsRead);
router.patch('/:id/read', notificationsController.markAsRead);

module.exports = router;
