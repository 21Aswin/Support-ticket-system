const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/tickets.controller');
const commentsController = require('../controllers/comments.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

router.use(authenticate);

// Ticket CRUD
router.get('/', ticketsController.list);
router.post('/', authorize(['Employee', 'Admin']), ticketsController.create);
router.get('/:id', ticketsController.getById);
router.put('/:id', ticketsController.update);

// Status transition and Assignment
router.patch('/:id/status', ticketsController.updateStatus);
router.patch('/:id/assign', authorize(['Admin']), ticketsController.assign);

// Comments and History
router.get('/:id/comments', commentsController.getComments);
router.post('/:id/comments', commentsController.addComment);
router.get('/:id/history', commentsController.getHistory);

module.exports = router;
