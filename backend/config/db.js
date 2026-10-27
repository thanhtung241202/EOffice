// backend/config/db.js
const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  server: 'ADMIN-PC', // Tên máy tính thực tế
  database: 'EOffice',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS'
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('[Database] Đã kết nối thành công vào EOffice');
    return pool;
  })
  .catch(err => {
    console.error('[Database] Lỗi kết nối:', err.message);
    process.exit(1);
  });

module.exports = {
  sql,
  poolPromise,
  getPool: () => poolPromise
};