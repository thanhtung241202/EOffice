// models/approvalStep.model.js
const { sql } = require('../config/db');

const ApprovalStepModel = {
  // 1. Tạo bước duyệt mới
  async create(data, transaction) {
    const request = new sql.Request(transaction);

    await request
      .input('submission_id', sql.UniqueIdentifier, data.submission_id)
      .input('step_order', sql.Int, data.step_order)
      .input('approver_id', sql.UniqueIdentifier, data.approver_id)
      .input('step_role', sql.VarChar(20), data.step_role)
      .input('status', sql.VarChar(20), data.status)
      .query(`
        INSERT INTO approval_steps (
          id, submission_id, step_order, approver_id, step_role, status, created_at, updated_at
        )
        VALUES (
          NEWID(), @submission_id, @step_order, @approver_id, @step_role, @status, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
        );
      `);
  },

  // 2. Lấy danh sách hồ sơ đang chờ xử lý của người dùng (Đã bổ sung lọc s.deleted_at IS NULL)
  async getPendingByUser(userId, pool) {
    const request = pool.request();
    const result = await request
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          s.id AS id,
          s.id AS submission_id,
          s.document_code,
          s.title,
          s.category,
          s.priority,
          s.confidentiality,
          s.status,
          s.current_step_order,
          s.total_steps,
          s.created_at AS created_at,
          s.created_at AS submission_created_at,
          u.name AS creator_name,
          u.department AS creator_department,
          step.id AS current_step_id,
          step.step_role,
          step.created_at AS assigned_at
        FROM approval_steps step
        INNER JOIN submissions s ON step.submission_id = s.id
        INNER JOIN users u ON s.created_by_id = u.id
        WHERE step.approver_id = @user_id 
          AND step.status = 'PENDING'
          AND s.status = 'IN_PROGRESS'
          AND s.deleted_at IS NULL
        ORDER BY 
          CASE s.priority WHEN 'URGENT' THEN 1 ELSE 2 END ASC,
          step.created_at ASC;
      `);

    return result.recordset;
  },

  // Alias tương đương để Service gọi getPendingByApprover không bao giờ bị lỗi
  async getPendingByApprover(userId, pool) {
    return this.getPendingByUser(userId, pool);
  },

  // 3. Khóa dòng bước duyệt hiện tại để xử lý đồng thời
  async findByOrderForUpdate(submissionId, stepOrder, transaction) {
    const request = new sql.Request(transaction);
    const result = await request
      .input('submission_id', sql.UniqueIdentifier, submissionId)
      .input('step_order', sql.Int, stepOrder)
      .query(`
        SELECT id, approver_id, status 
        FROM approval_steps WITH (UPDLOCK, ROWLOCK)
        WHERE submission_id = @submission_id AND step_order = @step_order;
      `);
    return result.recordset[0];
  },

  // 4. Cập nhật trạng thái bước duyệt (PASSED, RETURNED, REJECTED)
  async updateStatus(stepId, status, transaction) {
    const request = new sql.Request(transaction);
    await request
      .input('step_id', sql.UniqueIdentifier, stepId)
      .input('status', sql.VarChar(20), status)
      .query(`
        UPDATE approval_steps 
        SET status = @status, 
            action_date = SYSDATETIMEOFFSET(),
            updated_at = SYSDATETIMEOFFSET()
        WHERE id = @step_id;
      `);
  },

  // 5. Kích hoạt bước tiếp theo thành PENDING
  async activateStep(submissionId, stepOrder, transaction) {
    const request = new sql.Request(transaction);
    await request
      .input('submission_id', sql.UniqueIdentifier, submissionId)
      .input('step_order', sql.Int, stepOrder)
      .query(`
        UPDATE approval_steps 
        SET status = 'PENDING', updated_at = SYSDATETIMEOFFSET()
        WHERE submission_id = @submission_id AND step_order = @step_order;
      `);
  },

  // 6. Lấy toàn bộ chuỗi phê duyệt theo tờ trình
  async getStepsBySubmission(submissionId, pool) {
    const request = pool.request();
    const result = await request
      .input('submission_id', sql.UniqueIdentifier, submissionId)
      .query(`
        SELECT 
          step.id,
          step.step_order,
          step.step_role,
          step.status,
          step.action_date,
          u.id AS approver_id,
          u.name AS approver_name,
          u.job_title AS approver_job_title,
          u.department AS approver_department
        FROM approval_steps step
        INNER JOIN users u ON step.approver_id = u.id
        WHERE step.submission_id = @submission_id
        ORDER BY step.step_order ASC;
      `);
    return result.recordset;
  },

  // Alias tương đương để Service gọi getBySubmissionId không bị lỗi
  async getBySubmissionId(submissionId, pool) {
    return this.getStepsBySubmission(submissionId, pool);
  },

  // 7. Reset tất cả các bước về từ đầu khi nộp lại (trường hợp quay về bước 1)
  async resetStepsForResubmit(submissionId, transaction) {
    const request = new sql.Request(transaction);
    await request
      .input('submission_id', sql.UniqueIdentifier, submissionId)
      .query(`
        UPDATE approval_steps
        SET status = 'PENDING', action_date = NULL, updated_at = SYSDATETIMEOFFSET()
        WHERE submission_id = @submission_id AND step_order = 1;

        UPDATE approval_steps
        SET status = 'WAITING', action_date = NULL, updated_at = SYSDATETIMEOFFSET()
        WHERE submission_id = @submission_id AND step_order > 1;
      `);
  },

  // 8. Kích hoạt lại đích danh bước bị trả về (đẩy thẳng lên người thứ 3)
  async reactivateReturnedStep(submissionId, stepOrder, transaction) {
    const request = new sql.Request(transaction);
    await request
      .input('submission_id', sql.UniqueIdentifier, submissionId)
      .input('step_order', sql.Int, stepOrder)
      .query(`
        UPDATE approval_steps
        SET 
          status = 'PENDING', 
          action_date = NULL, 
          updated_at = SYSDATETIMEOFFSET()
        WHERE submission_id = @submission_id AND step_order = @step_order;
      `);
  }
};

module.exports = ApprovalStepModel;