// backend/services/auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const db = require('../config/db');

// Hàm hỗ trợ lấy pool kết nối linh hoạt theo file db.js
const resolveDbPool = async () => {
  if (typeof db.getPool === 'function') {
    return await db.getPool();
  }
  if (db.poolPromise) {
    return await db.poolPromise;
  }
  if (db.pool) {
    return db.pool;
  }
  return db;
};

const AuthService = {
  /**
   * Xử lý xác thực đăng nhập người dùng
   * @param {string} email - Email công vụ
   * @param {string} password - Mật khẩu người dùng nhập
   */
  async login(email, password) {
    const pool = await resolveDbPool();
    const cleanEmail = email ? email.trim() : '';

    // 1. Tìm tài khoản trong database
    const user = await UserModel.findByEmailForAuth(cleanEmail, pool);
    if (!user) {
      const error = new Error('Tài khoản hoặc mật khẩu không chính xác.');
      error.statusCode = 401;
      throw error;
    }

    // 2. Kiểm tra cờ xóa mềm (Soft delete)
    if (user.deleted_at) {
      const error = new Error('Tài khoản đã bị xóa hoặc vô hiệu hóa khỏi hệ thống.');
      error.statusCode = 403;
      throw error;
    }

    // 3. Kiểm tra trạng thái hoạt động (is_active = 0)
    if (!user.is_active) {
      const error = new Error('Tài khoản hiện đang bị khóa. Vui lòng liên hệ Quản trị viên để được mở khóa.');
      error.statusCode = 403;
      throw error;
    }

    // 4. So khớp mật khẩu với mã băm bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      // Ghi nhận lần nhập sai và cập nhật cờ is_active = 0 nếu >= 3 lần
      const updateResult = await UserModel.recordFailedLogin(cleanEmail, pool);
      const attempts = updateResult ? updateResult.failed_attempts : (user.failed_attempts || 0) + 1;

      if (attempts >= 3) {
        const error = new Error('Bạn đã nhập sai mật khẩu 3 lần liên tiếp. Tài khoản đã bị tự động khóa. Vui lòng liên hệ Quản trị viên!');
        error.statusCode = 403;
        throw error;
      } else {
        const remaining = 3 - attempts;
        const error = new Error(`Mật khẩu không chính xác. Bạn còn ${remaining} lần thử trước khi tài khoản bị khóa.`);
        error.statusCode = 401;
        throw error;
      }
    }

    // 5. Đăng nhập thành công -> Đưa số lần thử sai về 0
    if (user.failed_attempts > 0) {
      await UserModel.resetFailedLogin(user.id, pool);
    }

    // 6. Tạo JWT Token
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      job_title: user.job_title,
      is_admin: Boolean(user.is_admin)
    };

    const secretKey = process.env.JWT_SECRET || 'EOFFICE_SECRET_KEY';
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

    const token = jwt.sign(payload, secretKey, { expiresIn });

    return {
      token,
      user: payload
    };
  }
};

module.exports = AuthService;