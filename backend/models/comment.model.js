// models/comment.model.js
const { sql } = require('../config/db');

const CommentModel = {
  // Tạo comment mới
  async create({ submission_id, user_id, content }, transactionOrPool) {
    const request = new sql.Request(transactionOrPool);
    await request
      .input('submission_id', sql.UniqueIdentifier, submission_id)
      .input('user_id', sql.UniqueIdentifier, user_id)
      .input('content', sql.NVarChar(sql.MAX), content)
      .query(`
        INSERT INTO submission_comments (id, submission_id, user_id, content, created_at)
        VALUES (NEWID(), @submission_id, @user_id, @content, SYSDATETIMEOFFSET());
      `);
  },

  // Lấy danh sách comment theo submissionId
  async getBySubmissionId(submissionId, pool) {
    const request = pool.request();
    const result = await request
      .input('submission_id', sql.UniqueIdentifier, submissionId)
      .query(`
        SELECT 
          c.id,
          c.submission_id,
          c.content,
          c.created_at,
          u.id AS author_id,
          u.name AS author_name,
          u.job_title AS author_job_title,
          u.department AS author_department
        FROM submission_comments c
        INNER JOIN users u ON c.user_id = u.id
        WHERE c.submission_id = @submission_id
        ORDER BY c.created_at ASC;
      `);
    return result.recordset;
  }
};

module.exports = CommentModel;