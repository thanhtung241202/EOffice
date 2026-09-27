// backend/middlewares/auth.middleware.js
const { poolPromise } = require('../config/db');
const UserModel = require('../models/user.model');

const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ error: 'Yêu cầu đăng nhập (thiếu x-user-id).' });
    }

    const pool = await poolPromise;
    const user = await UserModel.findById(userId, pool);

    if (!user) {
      return res.status(404).json({ error: 'Tài khoản không tồn tại trong hệ thống.' });
    }

    if (!user.is_admin) {
      return res.status(403).json({ 
        error: 'Truy cập bị từ chối! Bạn không có quyền quản trị viên (Admin).' 
      });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error('[Admin Guard Error]:', error);
    return res.status(500).json({ error: 'Lỗi xác thực quyền quản trị.' });
  }
};

module.exports = { requireAdmin };