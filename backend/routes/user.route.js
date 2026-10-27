// routes/user.route.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// Tất cả thao tác user đều cần đăng nhập
router.use(authenticate);

// Xem danh sách user (để chọn người duyệt) không cần quyền Admin
router.get('/', UserController.getList);

// Các thao tác quản trị nhân sự bắt buộc quyền Admin
router.post('/', requireAdmin, UserController.create);
router.get('/organization', requireAdmin, UserController.getOrgStructure);
router.put('/:id', requireAdmin, UserController.update);
router.patch('/:id/toggle-active', requireAdmin, UserController.toggleActive);
router.patch('/:id/reset-password', requireAdmin, UserController.resetPassword);
router.delete('/:id', requireAdmin, UserController.softDelete);
router.patch('/:id/restore', requireAdmin, UserController.restore);

module.exports = router;