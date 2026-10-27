// models/submission.model.js
const { sql } = require('../config/db');

const SubmissionModel = {
  // 1. Tạo mới tờ trình
  async create(data, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    const status = data.status || 'IN_PROGRESS';

    // Lấy số thứ tự tăng dần trực tiếp từ Sequence
    const seqResult = await request.query(`SELECT NEXT VALUE FOR dbo.SubmissionCodeSeq AS next_num;`);
    const documentCode = String(seqResult.recordset[0].next_num);

    const result = await request
      .input('document_code', sql.NVarChar(50), documentCode)
      .input('title', sql.NVarChar(255), data.title)
      .input('content', sql.NVarChar(sql.MAX), data.content)
      .input('category', sql.NVarChar(100), data.category)
      .input('priority', sql.VarChar(20), data.priority || 'NORMAL')
      .input('confidentiality', sql.VarChar(20), data.confidentiality || 'NORMAL')
      .input('status', sql.VarChar(20), status)
      .input('current_step_order', sql.Int, status === 'DRAFT' ? 0 : 1)
      .input('total_steps', sql.Int, data.total_steps || (data.steps ? data.steps.length : 1))
      .input('created_by_id', sql.UniqueIdentifier, data.created_by_id)
      .query(`
        INSERT INTO submissions (
          id, document_code, title, content, category, priority, confidentiality,
          status, current_step_order, total_steps, created_by_id,
          created_at, updated_at
        )
        OUTPUT INSERTED.id, INSERTED.document_code, INSERTED.status
        VALUES (
          NEWID(), @document_code, @title, @content, @category, @priority, @confidentiality,
          @status, @current_step_order, @total_steps, @created_by_id,
          SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
        );
      `);
    return result.recordset[0];
  },

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

  // 4. Ký duyệt hoàn tất chu trình (Không làm mất document_code ban đầu)
  async markApproved(id, { docCode, finalApproverId }, transaction) {
    const request = new sql.Request(transaction);
    await request
      .input('id', sql.UniqueIdentifier, id)
      .input('doc_code', sql.NVarChar(50), docCode || null)
      .input('final_approver_id', sql.UniqueIdentifier, finalApproverId)
      .query(`
        UPDATE submissions 
        SET status = 'APPROVED',
            document_code = COALESCE(@doc_code, document_code),
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

  // 7. Chỉnh sửa và nộp lại tờ trình
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

  // 8. Lấy danh sách tờ trình do một người tạo
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

  // 9. Lấy danh sách tờ trình đã xử lý của người duyệt
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
          s.status,
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

  // 11. Lấy danh sách tờ trình được chia sẻ với người dùng
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

  // 12. Lấy danh sách tờ trình đã phê duyệt (Đã bổ sung current_step_order và hỗ trợ phân quyền theo user)
 async getApprovedList(userId, pool) {
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
          s.completed_at,
          creator.name AS creator_name,
          creator.department AS creator_department,
          final_app.name AS final_approver_name
        FROM submissions s
        INNER JOIN users creator ON s.created_by_id = creator.id
        LEFT JOIN users final_app ON s.final_approver_id = final_app.id
        WHERE s.status = 'APPROVED' 
          AND s.created_by_id = @user_id
          AND s.deleted_at IS NULL
        ORDER BY s.completed_at DESC;
      `);
    return result.recordset;
  },
  async search(keyword, pool) {
    const request = pool.request();
    const cleanKeyword = keyword.replace(/^#/, '').trim();

    const result = await request
      .input('keyword', sql.NVarChar(255), `%${cleanKeyword}%`)
      .query(`
        SELECT TOP 10
          s.id,
          s.document_code,
          s.title,
          s.category,
          s.status,
          s.created_at,
          u.name AS creator_name
        FROM submissions s
        INNER JOIN users u ON s.created_by_id = u.id
        WHERE s.deleted_at IS NULL
          AND (
            s.document_code LIKE @keyword
            OR s.title LIKE @keyword 
            OR CAST(s.id AS NVARCHAR(36)) LIKE @keyword
            OR u.name LIKE @keyword
          )
        ORDER BY s.updated_at DESC;
      `);
    return result.recordset;
  },

  async getDraftsByCreator(userId, pool) {
    const request = pool.request();
    const result = await request
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          s.id, s.title, s.category, s.priority, s.confidentiality,
          s.status, s.created_at, s.updated_at,
          u.name AS creator_name
        FROM submissions s
        INNER JOIN users u ON s.created_by_id = u.id
        WHERE s.created_by_id = @user_id 
          AND s.status = 'DRAFT' 
          AND s.deleted_at IS NULL
        ORDER BY s.updated_at DESC;
      `);
    return result.recordset;
  },

  // 15. Kích hoạt tờ trình nháp vào luồng duyệt
  async publishDraft(submissionId, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    await request
      .input('id', sql.UniqueIdentifier, submissionId)
      .query(`
        UPDATE submissions
        SET 
          status = 'IN_PROGRESS',
          current_step_order = 1,
          updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id AND status = 'DRAFT';

        UPDATE approval_steps
        SET status = 'PENDING', updated_at = SYSDATETIMEOFFSET()
        WHERE submission_id = @id AND step_order = 1;
      `);
  }
};

module.exports = SubmissionModel;