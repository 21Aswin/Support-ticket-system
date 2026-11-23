const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

router.use(authenticate);

router.get('/', categoriesController.listCategories);
router.post('/', authorize(['Admin']), categoriesController.createCategory);
router.put('/:id', authorize(['Admin']), categoriesController.updateCategory);
router.patch('/:id/status', authorize(['Admin']), categoriesController.updateStatus);

module.exports = router;
