
const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const dbConfig = {
  connectionString: process.env.connectionString,

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
};