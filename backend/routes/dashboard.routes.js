const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/authenticate');

router.use(authenticate);

router.get('/stats', dashboardController.getStats);
router.get('/recent-tickets', dashboardController.getRecentTickets);

module.exports = router;
