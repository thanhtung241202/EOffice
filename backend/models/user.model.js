// models/user.model.js
const { sql } = require('../config/db');

const UserModel = {
  async findByEmail(email, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    const result = await request
      .input('email', sql.VarChar(255), email)
      .query(`SELECT id, name FROM users WHERE email = @email`);
    return result.recordset[0]; // Trả về object user hoặc undefined
  }
};

module.exports = UserModel;