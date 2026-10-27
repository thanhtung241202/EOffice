// middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.split(' ')[1] 
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để truy cập hệ thống.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi xác thực người dùng.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác quản trị này.' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };