// backend/models/user.model.js
const { sql } = require('../config/db');

const UserModel = {
  async findByEmail(email, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    const result = await request
      .input('email', sql.VarChar(255), email)
      .query(`SELECT id, name, email, department, job_title, is_active, is_admin FROM users WHERE email = @email`);
    return result.recordset[0]; 
  },

  // 2. Lấy danh sách người dùng kèm bộ lọc (tìm kiếm, phòng ban, trạng thái hoạt động / xóa mềm)
  async getAll({ search, department, status }, pool) {
    const request = pool.request();
    let query = `
      SELECT 
        id, name, email, department, job_title, 
        is_active, is_admin, deleted_at, created_at, updated_at
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

  // 3. Tìm user theo ID
  async findById(id, pool) {
    const request = pool.request();
    const result = await request
      .input('id', sql.UniqueIdentifier, id)
      .query(`SELECT * FROM users WHERE id = @id;`);
    return result.recordset[0];
  },

  // 4. Tạo người dùng mới
  async create(data, pool) {
    const request = pool.request();
    const result = await request
      .input('name', sql.NVarChar(255), data.name)
      .input('email', sql.NVarChar(255), data.email)
      .input('password_hash', sql.VarChar(255), data.password_hash || '$2a$10$defaultHashPlaceholder')
      .input('department', sql.NVarChar(100), data.department)
      .input('job_title', sql.NVarChar(100), data.job_title)
      .input('is_admin', sql.Bit, data.is_admin ? 1 : 0)
      .query(`
        INSERT INTO users (
          id, name, email, password_hash, department, job_title, 
          is_active, is_admin, created_at, updated_at
        )
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.department, INSERTED.job_title, INSERTED.is_admin
        VALUES (
          NEWID(), @name, @email, @password_hash, @department, @job_title, 
          1, @is_admin, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
        );
      `);
    return result.recordset[0];
  },

  // 5. Cập nhật thông tin nhân viên & cơ cấu tổ chức
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

  // 6. Đổi trạng thái hoạt động (Khóa / Mở khóa tài khoản)
  async toggleActive(id, pool) {
    const request = pool.request();
    const result = await request
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE users
        SET 
          is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
          updated_at = SYSDATETIMEOFFSET()
        OUTPUT INSERTED.is_active
        WHERE id = @id;
      `);
    return result.recordset[0]?.is_active;
  },

  // 7. Xóa mềm (Soft Delete - cập nhật deleted_at và khóa đăng nhập)
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

  // 8. Khôi phục tài khoản đã xóa mềm
  async restore(id, pool) {
    const request = pool.request();
    await request
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE users
        SET 
          deleted_at = NULL,
          is_active = 1,
          updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id;
      `);
  },

  // 9. Thống kê cơ cấu tổ chức theo phòng ban & chức danh
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
      SELECT id, name, email, department, job_title, is_active, is_admin, deleted_at
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