// routes/notification.routes.js
const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');

const mockAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Vui lòng cung cấp x-user-id qua header.' });
  }
  req.user = { id: userId };
  next();
};

router.get('/', mockAuth, NotificationController.getNotifications);
router.put('/mark-all-read', mockAuth, NotificationController.markAllAsRead);
router.put('/:id/read', mockAuth, NotificationController.markAsRead);

module.exports = router;