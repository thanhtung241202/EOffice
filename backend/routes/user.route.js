// backend/routes/user.route.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

router.use(requireAdmin);
router.get('/', UserController.getList);
router.post('/', UserController.create);
router.get('/organization', UserController.getOrgStructure);
router.put('/:id', UserController.update);
router.patch('/:id/toggle-active', UserController.toggleActive);
router.delete('/:id', UserController.softDelete);
router.patch('/:id/restore', UserController.restore);

module.exports = router;