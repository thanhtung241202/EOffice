// models/submissionViewer.model.js
const { sql } = require('../config/db');

const SubmissionViewerModel = {
  // 1. Lấy danh sách các tờ trình được chia sẻ cho 1 user (Dùng cho tab "Tờ trình được chia sẻ")
  async getSharedWithUser(userId, pool) {
    const request = pool.request();
    const result = await request
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          s.id,
          s.id AS submission_id, -- Trả về thêm field này để frontend dễ map key
          s.document_code,
          s.title,
          s.category,
          s.priority,
          s.confidentiality,
          s.status,
          s.current_step_order,
          s.total_steps,
          s.created_at,
          creator.name AS creator_name,
          sharer.name AS shared_by_name,
          sv.created_at AS shared_at
        FROM submission_viewers sv
        INNER JOIN submissions s ON sv.submission_id = s.id
        LEFT JOIN users creator ON s.created_by_id = creator.id
        LEFT JOIN users sharer ON sv.shared_by_id = sharer.id
        WHERE sv.user_id = @user_id
          AND s.deleted_at IS NULL
        ORDER BY sv.created_at DESC;
      `);
    return result.recordset;
  },

  // 2. Kiểm tra xem tờ trình đã được chia sẻ cho user này trước đó chưa
  async checkExists(submissionId, userId, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    const result = await request
      .input('sub_id', sql.UniqueIdentifier, submissionId)
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 1 
        FROM submission_viewers 
        WHERE submission_id = @sub_id AND user_id = @user_id
      `);
    return result.recordset.length > 0;
  },

  // 3. Thêm mới bản ghi cấp quyền xem tờ trình
  async addViewer(submissionId, userId, sharedById, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    await request
      .input('sub_id', sql.UniqueIdentifier, submissionId)
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('shared_by_id', sql.UniqueIdentifier, sharedById)
      .query(`
        INSERT INTO submission_viewers (id, submission_id, user_id, shared_by_id, created_at)
        VALUES (NEWID(), @sub_id, @user_id, @shared_by_id, SYSDATETIMEOFFSET())
      `);
  }
};

module.exports = SubmissionViewerModel;