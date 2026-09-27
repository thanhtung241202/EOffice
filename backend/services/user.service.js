// backend/services/user.service.js
const { poolPromise } = require('../config/db');
const UserModel = require('../models/user.model');

const UserService = {
  async getUsers(filters) {
    const pool = await poolPromise;
    return await UserModel.getAll(filters, pool);
  },

  async createUser(payload) {
    const pool = await poolPromise;

    const existingUser = await UserModel.findByEmail(payload.email, pool);
    if (existingUser) {
      const error = new Error(`Email "${payload.email}" đã tồn tại trong hệ thống.`);
      error.statusCode = 400;
      throw error;
    }

    return await UserModel.create(payload, pool);
  },

  // Cập nhật nhân sự
  async updateUser(id, payload) {
    const pool = await poolPromise;

    const user = await UserModel.findById(id, pool);
    if (!user) {
      const error = new Error('Tài khoản không tồn tại.');
      error.statusCode = 404;
      throw error;
    }

    await UserModel.update(id, payload, pool);
    return { success: true };
  },

  // Đổi trạng thái hoạt động (Active / Inactive)
  async toggleUserActive(id) {
    const pool = await poolPromise;
    const user = await UserModel.findById(id, pool);
    if (!user) {
      const error = new Error('Tài khoản không tồn tại.');
      error.statusCode = 404;
      throw error;
    }

    const newStatus = await UserModel.toggleActive(id, pool);
    return { is_active: newStatus };
  },

  // Xóa mềm tài khoản
  async softDeleteUser(id, currentAdminId) {
    const pool = await poolPromise;

    if (String(id).toLowerCase() === String(currentAdminId).toLowerCase()) {
      const error = new Error('Bạn không thể tự xóa tài khoản quản trị của chính mình.');
      error.statusCode = 400;
      throw error;
    }

    const user = await UserModel.findById(id, pool);
    if (!user) {
      const error = new Error('Tài khoản không tồn tại.');
      error.statusCode = 404;
      throw error;
    }

    await UserModel.softDelete(id, pool);
    return { success: true };
  },

  // Khôi phục tài khoản
  async restoreUser(id) {
    const pool = await poolPromise;
    await UserModel.restore(id, pool);
    return { success: true };
  },

  // Lấy sơ đồ tổ chức
  async getOrganizationTree() {
    const pool = await poolPromise;
    return await UserModel.getOrganizationStructure(pool);
  }
};

module.exports = UserService;