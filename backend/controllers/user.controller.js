const UserService = require('../services/user.service');

const UserController = {
  async getList(req, res) {
    try {
      const { search, department, status } = req.query;
      const data = await UserService.getUsers({ search, department, status });
      return res.status(200).json({ data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  async create(req, res) {
    try {
      const { name, email, department, job_title, is_admin } = req.body;
      if (!name || !email || !department || !job_title) {
        return res.status(400).json({ error: 'Vui lòng điền đầy đủ Tên, Email, Phòng ban và Chức danh.' });
      }

      const result = await UserService.createUser({ name, email, department, job_title, is_admin });
      return res.status(201).json({ message: 'Tạo tài khoản thành công!', data: result });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, department, job_title, is_admin } = req.body;
      await UserService.updateUser(id, { name, department, job_title, is_admin });
      return res.status(200).json({ message: 'Cập nhật tài khoản thành công!' });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  },

  async toggleActive(req, res) {
    try {
      const { id } = req.params;
      const result = await UserService.toggleUserActive(id);
      return res.status(200).json({ message: 'Đã đổi trạng thái tài khoản.', data: result });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  },

  async softDelete(req, res) {
    try {
      const { id } = req.params;
      const currentAdminId = req.headers['x-user-id'];
      await UserService.softDeleteUser(id, currentAdminId);
      return res.status(200).json({ message: 'Đã đưa tài khoản vào danh sách xóa mềm.' });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  },

  async restore(req, res) {
    try {
      const { id } = req.params;
      await UserService.restoreUser(id);
      return res.status(200).json({ message: 'Đã khôi phục tài khoản thành công!' });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  },

  async getOrgStructure(req, res) {
    try {
      const data = await UserService.getOrganizationTree();
      return res.status(200).json({ data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
};

module.exports = UserController;