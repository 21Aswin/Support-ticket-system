const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

router.use(authenticate);

// List users (Admin can list all, or Support Staff/Employee can list support staff for reference)
router.get('/', (req, res, next) => {
  // If query is specifically role=Support Staff, allow authenticated users to view support staff list for assignment/info
  if (req.query.role === 'Support Staff') {
    return usersController.listUsers(req, res, next);
  }
  return authorize(['Admin'])(req, res, () => usersController.listUsers(req, res, next));
});

router.get('/:id', usersController.getUserById);
router.post('/', authorize(['Admin']), usersController.createUser);
router.put('/:id', authorize(['Admin']), usersController.updateUser);
router.delete('/:id', authorize(['Admin']), usersController.deleteUser);

module.exports = router;
