// controllers/notification.controller.js
const { poolPromise } = require('../config/db');
const NotificationModel = require('../models/notification.model');

const NotificationController = {
  async getNotifications(req, res) {
    try {
      const userId = req.user?.id;
      const pool = await poolPromise;
      const [list, unreadCount] = await Promise.all([
        NotificationModel.getByUser(userId, pool),
        NotificationModel.countUnread(userId, pool)
      ]);

      return res.status(200).json({
        unread_count: unreadCount,
        data: list
      });
    } catch (error) {
      console.error('[Get Notifications Error]:', error);
      return res.status(500).json({ error: 'Lỗi khi lấy danh sách thông báo.' });
    }
  },

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const pool = await poolPromise;

      await NotificationModel.markAsRead(id, userId, pool);
      return res.status(200).json({ message: 'Đã đánh dấu đã đọc.' });
    } catch (error) {
      console.error('[Mark As Read Error]:', error);
      return res.status(500).json({ error: 'Lỗi cập nhật trạng thái thông báo.' });
    }
  },

  async markAllAsRead(req, res) {
    try {
      const userId = req.user?.id;
      const pool = await poolPromise;

      await NotificationModel.markAllAsRead(userId, pool);
      return res.status(200).json({ message: 'Đã đánh dấu tất cả là đã đọc.' });
    } catch (error) {
      console.error('[Mark All Read Error]:', error);
      return res.status(500).json({ error: 'Lỗi cập nhật thông báo.' });
    }
  }
};

module.exports = NotificationController;