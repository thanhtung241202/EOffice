const { sql } = require('../config/db');

const AttachmentModel = {
  async create({ submission_id, file_name, file_path, file_size }, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    const result = await request
      .input('submission_id', sql.UniqueIdentifier, submission_id)
      .input('file_name', sql.NVarChar(255), file_name)
      .input('file_path', sql.NVarChar(500), file_path)
      .input('file_size', sql.BigInt, file_size)
      .query(`
        INSERT INTO attachments (id, submission_id, file_name, file_path, file_size, created_at)
        OUTPUT INSERTED.*
        VALUES (NEWID(), @submission_id, @file_name, @file_path, @file_size, SYSDATETIMEOFFSET());
      `);
    return result.recordset[0];
  },

  async getBySubmissionId(submissionId, pool) {
    const request = pool.request();
    const result = await request
      .input('submission_id', sql.UniqueIdentifier, submissionId)
      .query(`
        SELECT id, submission_id, file_name, file_path, file_size, created_at
        FROM attachments
        WHERE submission_id = @submission_id
        ORDER BY created_at ASC;
      `);
    return result.recordset;
  },

  async findById(id, pool) {
    const request = pool.request();
    const result = await request
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT * FROM attachments WHERE id = @id;
      `);
    return result.recordset[0];
  },

  async deleteById(id, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    await request
      .input('id', sql.UniqueIdentifier, id)
      .query(`DELETE FROM attachments WHERE id = @id;`);
  }
};

module.exports = AttachmentModel;