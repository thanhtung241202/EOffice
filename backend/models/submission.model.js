// models/submission.model.js
const { sql } = require('../config/db');

const SubmissionModel = {
  // 1. Tạo mới tờ trình
  async create(data, transaction) {
    const request = new sql.Request(transaction);
    const result = await request
      .input('title', sql.NVarChar(255), data.title)
      .input('content', sql.NVarChar(sql.MAX), data.content)
      .input('category', sql.NVarChar(100), data.category || 'GENERAL')
      .input('confidentiality', sql.VarChar(20), data.confidentiality || 'NORMAL')
      .input('priority', sql.VarChar(20), data.priority || 'NORMAL')
      .input('total_steps', sql.Int, data.total_steps)
      .input('created_by_id', sql.UniqueIdentifier, data.created_by_id)
      .query(`
        INSERT INTO submissions (
          id, title, content, category, confidentiality, priority,
          status, current_step_order, total_steps, created_by_id, created_at, updated_at
        )
        OUTPUT INSERTED.id
        VALUES (
          NEWID(), @title, @content, @category, @confidentiality, @priority,
          'IN_PROGRESS', 1, @total_steps, @created_by_id, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
        );
      `);
    return result.recordset[0].id;
  },

  // 2. Tìm và khóa dòng bằng UPDLOCK, ROWLOCK (chỉ lấy bản ghi chưa bị xóa mềm)
  async findByIdForUpdate(id, transaction) {
    const request = new sql.Request(transaction);
    const result = await request
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT id, status, current_step_order, total_steps, created_by_id
        FROM submissions WITH (UPDLOCK, ROWLOCK)
        WHERE id = @id AND deleted_at IS NULL;
      `);
    return result.recordset[0];
  },

  // 3. Chuyển sang bước tiếp theo
  async incrementStep(id, nextOrder, transaction) {
    const request = new sql.Request(transaction);
    await request
      .input('id', sql.UniqueIdentifier, id)
      .input('next_order', sql.Int, nextOrder)
      .query(`
        UPDATE submissions 
        SET current_step_order = @next_order, updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id;
      `);
  },

  // 4. Ký duyệt hoàn tất chu trình
  async markApproved(id, { docCode, finalApproverId }, transaction) {
    const request = new sql.Request(transaction);
    await request
      .input('id', sql.UniqueIdentifier, id)
      .input('doc_code', sql.NVarChar(50), docCode)
      .input('final_approver_id', sql.UniqueIdentifier, finalApproverId)
      .query(`
        UPDATE submissions 
        SET status = 'APPROVED',
            document_code = @doc_code,
            final_approver_id = @final_approver_id,
            completed_at = SYSDATETIMEOFFSET(),
            updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id;
      `);
  },

  // 5. Cập nhật trạng thái tờ trình (RETURNED, REJECTED, ...)
  async updateStatus(id, status, transaction) {
    const request = new sql.Request(transaction);
    await request
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.VarChar(20), status)
      .query(`
        UPDATE submissions 
        SET status = @status, updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id;
      `);
  },

  // 6. Lấy chi tiết tờ trình (chỉ lấy bản ghi chưa bị xóa mềm)
  async getDetail(id, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    const result = await request
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          s.*,
          creator.name AS creator_name,
          creator.department AS creator_department,
          creator.job_title AS creator_job_title,
          final_app.name AS final_approver_name
        FROM submissions s
        INNER JOIN users creator ON s.created_by_id = creator.id
        LEFT JOIN users final_app ON s.final_approver_id = final_app.id
        WHERE s.id = @id AND s.deleted_at IS NULL;
      `);
    return result.recordset[0];
  },

  // 7. Chỉnh sửa và nộp lại tờ trình (giữ nguyên current_step_order để gửi thẳng người trả)
  async resubmit(id, data, transaction) {
    const request = new sql.Request(transaction);
    await request
      .input('id', sql.UniqueIdentifier, id)
      .input('title', sql.NVarChar(255), data.title)
      .input('content', sql.NVarChar(sql.MAX), data.content)
      .input('category', sql.NVarChar(100), data.category)
      .input('confidentiality', sql.VarChar(20), data.confidentiality)
      .input('priority', sql.VarChar(20), data.priority)
      .query(`
        UPDATE submissions
        SET 
          title = @title,
          content = @content,
          category = @category,
          confidentiality = @confidentiality,
          priority = @priority,
          status = 'IN_PROGRESS',
          updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id;
      `);
  },

  // 8. Lấy danh sách tờ trình do một người tạo (bỏ qua bản ghi đã xóa mềm)
  async getByCreator(userId, pool) {
    const request = pool.request();
    const result = await request
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          s.id,
          s.document_code,
          s.title,
          s.category,
          s.priority,
          s.confidentiality,
          s.status,
          s.current_step_order,
          s.total_steps,
          s.created_at,
          u.name AS creator_name
        FROM submissions s
        INNER JOIN users u ON s.created_by_id = u.id
        WHERE s.created_by_id = @user_id 
          AND s.deleted_at IS NULL
        ORDER BY s.updated_at DESC;
      `);
    return result.recordset;
  },

  // 9. Lấy danh sách tờ trình đã xử lý (bỏ qua bản ghi đã xóa mềm)
  async getProcessedByApprover(userId, pool) {
    const request = pool.request();
    const result = await request
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT DISTINCT
          s.id,
          s.document_code,
          s.title,
          s.category,
          s.priority,
          s.confidentiality,
          s.status AS submission_status,
          s.current_step_order,
          s.total_steps,
          s.created_at,
          u.name AS creator_name,
          my_step.step_order AS my_step_order,
          my_step.step_role AS my_step_role,
          my_step.status AS my_action_status,
          my_step.action_date AS processed_at
        FROM submissions s
        INNER JOIN approval_steps my_step 
          ON s.id = my_step.submission_id 
          AND my_step.approver_id = @user_id
          AND my_step.status IN ('PASSED', 'RETURNED', 'REJECTED')
          AND my_step.action_date IS NOT NULL
        INNER JOIN users u ON s.created_by_id = u.id
        WHERE s.deleted_at IS NULL
        ORDER BY my_step.action_date DESC;
      `);
    return result.recordset;
  },

  // 10. Xóa mềm tờ trình
  async softDelete(id, userId, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    await request
      .input('id', sql.UniqueIdentifier, id)
      .input('deleted_by_id', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE submissions
        SET 
          deleted_at = SYSDATETIMEOFFSET(),
          deleted_by_id = @deleted_by_id,
          updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id;
      `);
  },
  async findByEmail(email, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    const result = await request
      .input('email', sql.VarChar(255), email)
      .query(`SELECT id, name FROM users WHERE email = @email`);
    return result.recordset[0];
  },

  async getSharedWithUser(userId, pool) {
    const request = pool.request();
    const result = await request
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          s.id,
          s.document_code,
          s.title,
          s.category,
          s.priority,
          s.confidentiality,
          s.status,
          s.current_step_order,
          s.total_steps,
          s.created_at,
          u.name AS creator_name
        FROM submissions s
        INNER JOIN submission_viewers sv ON s.id = sv.submission_id
        INNER JOIN users u ON s.created_by_id = u.id
        WHERE sv.user_id = @user_id 
          AND s.deleted_at IS NULL
        ORDER BY s.updated_at DESC;
      `);
    return result.recordset;
  },
  async getApprovedList(pool) {
    const request = pool.request();
    const result = await request.query(`
      SELECT 
        s.id,
        s.document_code,
        s.title,
        s.category,
        s.priority,
        s.confidentiality,
        s.status,
        s.total_steps,
        s.created_at,
        s.completed_at,
        creator.name AS creator_name,
        creator.department AS creator_department,
        final_app.name AS final_approver_name
      FROM submissions s
      INNER JOIN users creator ON s.created_by_id = creator.id
      LEFT JOIN users final_app ON s.final_approver_id = final_app.id
      WHERE s.status = 'APPROVED' AND s.deleted_at IS NULL
      ORDER BY s.completed_at DESC;
    `);
    return result.recordset;
  },
};

module.exports = SubmissionModel;