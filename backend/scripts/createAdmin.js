
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function main() {
  const sql = db.sql;
  let pool;

  try {
    pool = await db.getPool();
    const name = 'Quản trị viên';
    const email = 'admin@eoffice.vn';
    const password = 'admin1234';

    const existing = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query(`
        SELECT id, email, is_admin
        FROM dbo.users
        WHERE email = @email;
      `);

    if (existing.recordset.length > 0) {
      console.log('Email đã tồn tại. Không tạo tài khoản trùng.');
      console.table(existing.recordset);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.request()
      .input('name', sql.NVarChar(255), name)
      .input('email', sql.NVarChar(255), email)
      .input('password_hash', sql.VarChar(255), passwordHash)
      .query(`
        INSERT INTO dbo.users (
          id,
          name,
          email,
          password_hash,
          department,
          job_title,
          is_active,
          is_admin,
          failed_attempts,
          created_at,
          updated_at
        )
        OUTPUT
          INSERTED.id,
          INSERTED.name,
          INSERTED.email,
          INSERTED.is_admin,
          INSERTED.is_active
        VALUES (
          NEWID(),
          @name,
          @email,
          @password_hash,
          N'Quản trị hệ thống',
          N'Administrator',
          1,
          1,
          0,
          SYSDATETIMEOFFSET(),
          SYSDATETIMEOFFSET()
        );
      `);

    console.log('Tạo tài khoản Admin thành công:');
    console.log('Email:', email);
    console.log('Mật khẩu:', password);
    console.log('Hãy đổi mật khẩu sau lần đăng nhập đầu tiên.');
  } catch (error) {
    console.error('Không tạo được Admin:', error.message);
    process.exitCode = 1;
  } finally {
    if (pool && typeof pool.close === 'function') {
      await pool.close();
    }
  }
}

main();
