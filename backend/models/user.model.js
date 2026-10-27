// backend/models/user.model.js
const { sql } = require('../config/db');
const bcrypt = require('bcryptjs');

const UserModel = {
  // 1. Xác thực đăng nhập: Lấy thông tin kèm password_hash, trạng thái và số lần nhập sai
  async findByEmailForAuth(email, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    const result = await request
      .input('email', sql.NVarChar(255), email)
      .query(`
        SELECT 
          id, name, email, password_hash, department, job_title, 
          is_active, is_admin, deleted_at, 
          ISNULL(failed_attempts, 0) AS failed_attempts
        FROM users 
        WHERE email = @email;
      `);
    return result.recordset[0];
  },

  // 2. Tìm người dùng theo email (thông tin hiển thị thông thường)
  async findByEmail(email, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    const result = await request
      .input('email', sql.VarChar(255), email)
      .query(`
        SELECT 
          id, name, email, department, job_title, 
          is_active, is_admin, 
          ISNULL(failed_attempts, 0) AS failed_attempts
        FROM users 
        WHERE email = @email;
      `);
    return result.recordset[0];
  },

  // 3. Lấy danh sách nhân viên cho Admin có bộ lọc tìm kiếm và trạng thái
  async getAll({ search, department, status }, pool) {
    const request = pool.request();
    let query = `
      SELECT 
        id, name, email, department, job_title, 
        is_active, is_admin, deleted_at, 
        ISNULL(failed_attempts, 0) AS failed_attempts,
        created_at, updated_at
      FROM users
      WHERE 1=1
    `;

    if (search && search.trim()) {
      request.input('search', sql.NVarChar(255), `%${search.trim()}%`);
      query += ` AND (name LIKE @search OR email LIKE @search OR job_title LIKE @search)`;
    }

    if (department && department !== 'ALL') {
      request.input('department', sql.NVarChar(100), department);
      query += ` AND department = @department`;
    }

    if (status === 'ACTIVE') {
      query += ` AND deleted_at IS NULL AND is_active = 1`;
    } else if (status === 'LOCKED') {
      query += ` AND deleted_at IS NULL AND is_active = 0`;
    } else if (status === 'DELETED') {
      query += ` AND deleted_at IS NOT NULL`;
    }

    query += ` ORDER BY created_at DESC;`;

    const result = await request.query(query);
    return result.recordset;
  },

  // 4. Tìm người dùng theo ID
  async findById(id, pool) {
    const request = pool.request();
    const result = await request
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          id, name, email, department, job_title, 
          is_active, is_admin, deleted_at, 
          ISNULL(failed_attempts, 0) AS failed_attempts,
          created_at, updated_at 
        FROM users 
        WHERE id = @id;
      `);
    return result.recordset[0];
  },

  // 5. Tạo người dùng mới
  async create(data, pool) {
    const request = pool.request();
    const rawPassword = data.password || '123456';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const result = await request
      .input('name', sql.NVarChar(255), data.name)
      .input('email', sql.NVarChar(255), data.email)
      .input('password_hash', sql.VarChar(255), hashedPassword)
      .input('department', sql.NVarChar(100), data.department)
      .input('job_title', sql.NVarChar(100), data.job_title)
      .input('is_admin', sql.Bit, data.is_admin ? 1 : 0)
      .query(`
        INSERT INTO users (
          id, name, email, password_hash, department, job_title,
          is_active, is_admin, failed_attempts, created_at, updated_at
        )
        OUTPUT 
          INSERTED.id, INSERTED.name, INSERTED.email, 
          INSERTED.department, INSERTED.job_title, INSERTED.is_admin
        VALUES (
          NEWID(), @name, @email, @password_hash, @department, @job_title,
          1, @is_admin, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
        );
      `);
    return result.recordset[0];
  },

  // 6. Cập nhật thông tin nhân viên & cơ cấu tổ chức
  async update(id, data, pool) {
    const request = pool.request();
    await request
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar(255), data.name)
      .input('department', sql.NVarChar(100), data.department)
      .input('job_title', sql.NVarChar(100), data.job_title)
      .input('is_admin', sql.Bit, data.is_admin ? 1 : 0)
      .query(`
        UPDATE users
        SET 
          name = @name,
          department = @department,
          job_title = @job_title,
          is_admin = @is_admin,
          updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id;
      `);
  },

  // 7. Đổi trạng thái hoạt động (Khóa / Mở khóa tài khoản)
  // Khi mở khóa lại (is_active = 1), reset luôn số lần nhập sai về 0
  async toggleActive(id, pool) {
    const request = pool.request();
    const result = await request
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE users
        SET 
          is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
          failed_attempts = CASE WHEN is_active = 1 THEN failed_attempts ELSE 0 END,
          updated_at = SYSDATETIMEOFFSET()
        OUTPUT INSERTED.is_active, INSERTED.failed_attempts
        WHERE id = @id;
      `);
    return result.recordset[0]?.is_active;
  },

  // 8. Tăng số lần nhập sai và tự khóa tài khoản nếu đủ 3 lần
  async recordFailedLogin(email, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    const result = await request
      .input('email', sql.NVarChar(255), email)
      .query(`
        UPDATE users
        SET 
          failed_attempts = ISNULL(failed_attempts, 0) + 1,
          is_active = CASE WHEN ISNULL(failed_attempts, 0) + 1 >= 3 THEN 0 ELSE is_active END,
          updated_at = SYSDATETIMEOFFSET()
        OUTPUT INSERTED.failed_attempts, INSERTED.is_active
        WHERE email = @email AND deleted_at IS NULL;
      `);
    return result.recordset[0];
  },

  // 9. Reset số lần đăng nhập sai về 0 (dùng khi đăng nhập đúng hoặc admin can thiệp)
  async resetFailedLogin(id, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    await request
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE users
        SET 
          failed_attempts = 0,
          updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id;
      `);
  },

  // 10. Xóa mềm (Soft Delete - cập nhật deleted_at và khóa đăng nhập)
  async softDelete(id, pool) {
    const request = pool.request();
    await request
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE users
        SET 
          deleted_at = SYSDATETIMEOFFSET(),
          is_active = 0,
          updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id;
      `);
  },

  // 11. Khôi phục tài khoản đã xóa mềm
  async restore(id, pool) {
    const request = pool.request();
    await request
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE users
        SET 
          deleted_at = NULL,
          is_active = 1,
          failed_attempts = 0,
          updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id;
      `);
  },

  // 12. Quản trị viên cấp lại mật khẩu (reset luôn failed_attempts và kích hoạt lại tài khoản)
  async resetPassword(id, newPassword, pool) {
    const request = pool.request();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await request
      .input('id', sql.UniqueIdentifier, id)
      .input('password_hash', sql.VarChar(255), hashedPassword)
      .query(`
        UPDATE users
        SET 
          password_hash = @password_hash,
          failed_attempts = 0,
          is_active = 1,
          updated_at = SYSDATETIMEOFFSET()
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.is_active
        WHERE id = @id AND deleted_at IS NULL;
      `);

    return result.recordset[0];
  },

  // 13. Thống kê cơ cấu tổ chức
  async getOrganizationStructure(pool) {
    const request = pool.request();
    const result = await request.query(`
      SELECT 
        department,
        COUNT(id) AS total_members,
        SUM(CASE WHEN is_active = 1 AND deleted_at IS NULL THEN 1 ELSE 0 END) AS active_members,
        SUM(CASE WHEN is_admin = 1 AND deleted_at IS NULL THEN 1 ELSE 0 END) AS admin_members
      FROM users
      GROUP BY department
      ORDER BY total_members DESC;
    `);

    const usersResult = await pool.request().query(`
      SELECT 
        id, name, email, department, job_title, 
        is_active, is_admin, deleted_at,
        ISNULL(failed_attempts, 0) AS failed_attempts
      FROM users
      ORDER BY department, job_title;
    `);

    return {
      departments: result.recordset,
      members: usersResult.recordset
    };
  }
};

module.exports = UserModel;