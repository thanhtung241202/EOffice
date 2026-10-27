// controllers/auth.controller.js
const AuthService = require('../services/auth.service');

const AuthController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ email và mật khẩu.'
        });
      }

      const result = await AuthService.login(email.trim(), password);

      return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công.',
        data: result
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Đã xảy ra lỗi trong quá trình xác thực.'
      });
    }
  }
,

  async getMe(req, res) {
    try {
      return res.status(200).json({ data: req.user });
    } catch (error) {
      return res.status(500).json({ error: 'Không thể xác thực danh tính.' });
    }
  }
};

module.exports = AuthController;