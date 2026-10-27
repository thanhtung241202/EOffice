// routes/notification.routes.js
const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Áp dụng xác thực cho tất cả các endpoint notification
router.use(authenticate);

router.get('/', NotificationController.getNotifications);
router.put('/mark-all-read', NotificationController.markAllAsRead);
router.put('/:id/read', NotificationController.markAsRead);

module.exports = router;