// services/submission.service.js
const { sql, poolPromise } = require('../config/db');
const SubmissionModel = require('../models/submission.model');
const ApprovalStepModel = require('../models/approvalStep.model');
const CommentModel = require('../models/comment.model');
const NotificationModel = require('../models/notification.model');
const SubmissionViewerModel = require('../models/submissionViewer.model');
const UserModel = require('../models/user.model');
const AttachmentModel = require('../models/attachment.model');

const SubmissionService = {
  // 1. Tạo mới tờ trình kèm các bước phê duyệt & thông báo cho Bước 1
  async createSubmission(payload, creatorId) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const isDraft = payload.status === 'DRAFT';
      const steps = payload.steps && payload.steps.length > 0 ? payload.steps : [];

      if (!isDraft && steps.length === 0) {
        throw new Error('Vui lòng thiết lập ít nhất 1 người duyệt trong quy trình.');
      }

      // 1. Tạo submission
      const newSub = await SubmissionModel.create({
        ...payload,
        total_steps: steps.length,
        created_by_id: creatorId
      }, transaction);

      const submissionId = newSub.id;

      // 2. Tạo các bước duyệt theo danh sách người dùng đã chọn
      for (let i = 0; i < steps.length; i++) {
        const stepOrder = i + 1;
        const stepData = steps[i];
        const stepStatus = (!isDraft && stepOrder === 1) ? 'PENDING' : 'WAITING';

        await ApprovalStepModel.create({
          submission_id: submissionId,
          step_order: stepOrder,
          approver_id: stepData.approver_id,
          step_role: stepData.step_role || 'APPROVER',
          status: stepStatus
        }, transaction);
      }

      // 3. Nếu gửi duyệt ngay, gửi thông báo cho approver bước 1
      if (!isDraft && steps.length > 0) {
        await NotificationModel.create({
          user_id: steps[0].approver_id,
          submission_id: submissionId,
          type: 'PENDING',
          title: `Tờ trình cần xử lý [#${newSub.document_code}]`,
          content: `Bạn nhận được tờ trình "${payload.title}" cần xử lý.`,
          action_by_id: creatorId
        }, transaction);
      }

      await transaction.commit();
      return { 
        submission_id: submissionId, 
        document_code: newSub.document_code,
        message: isDraft ? 'Đã lưu bản nháp!' : 'Đã khởi tạo và gửi trình thành công!' 
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  // 2. Lấy danh sách hồ sơ cần xử lý của Approver hiện tại (Trả về mảng thuần để Controller bọc chuẩn)
  async getPendingList(userId) {
    const pool = await poolPromise;
    const data = await ApprovalStepModel.getPendingByApprover(userId, pool);
    return data;
  },

  // 3. Lấy danh sách hồ sơ do chính user lập
  async getMySubmissions(userId) {
    const pool = await poolPromise;
    const data = await SubmissionModel.getByCreator(userId, pool);
    return {
      total: data.length,
      data
    };
  },

  // 4. Lấy danh sách hồ sơ user đã từng xử lý
  async getProcessedSubmissions(userId) {
    const pool = await poolPromise;
    const data = await SubmissionModel.getProcessedByApprover(userId, pool);
    return {
      total: data.length,
      data
    };
  },

  // 5. Lấy chi tiết hồ sơ, chuỗi duyệt và lịch sử ý kiến
  async getSubmissionDetail(submissionId) {
    const pool = await poolPromise;

    const submission = await SubmissionModel.getDetail(submissionId, pool);
    if (!submission) {
      const error = new Error('Tờ trình không tồn tại hoặc đã bị xoá.');
      error.statusCode = 404;
      throw error;
    }

    const approval_steps = await ApprovalStepModel.getBySubmissionId(submissionId, pool);
    const comments = await CommentModel.getBySubmissionId(submissionId, pool);
    const attachments = await AttachmentModel.getBySubmissionId(submissionId, pool);

    return {
      submission,
      approval_steps,
      comments,
      attachments
    };
  },

  // 6. Xử lý hành động phê duyệt (APPROVE / RETURN / REJECT)
  async executeAction({ submissionId, action, comment, userId }) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Khóa và kiểm tra trạng thái submission
      const submission = await SubmissionModel.findByIdForUpdate(submissionId, transaction);
      if (!submission) {
        const error = new Error('Tờ trình không tồn tại hoặc đã bị xoá.');
        error.statusCode = 404;
        throw error;
      }

      const submissionDetail = await SubmissionModel.getDetail(submissionId, transaction);

      if (submission.status !== 'IN_PROGRESS') {
        const error = new Error(`Tờ trình hiện ở trạng thái [${submission.status}], không thể thao tác.`);
        error.statusCode = 409;
        throw error;
      }

      // Khóa và kiểm tra bước hiện tại
      const currentStep = await ApprovalStepModel.findByOrderForUpdate(
        submissionId,
        submission.current_step_order,
        transaction
      );

      if (!currentStep) {
        const error = new Error('Không tìm thấy dữ liệu bước phê duyệt hiện tại.');
        error.statusCode = 500;
        throw error;
      }

      if (currentStep.approver_id.toLowerCase() !== userId.toLowerCase()) {
        const error = new Error('Bạn không có thẩm quyền xử lý tại bước này.');
        error.statusCode = 403;
        throw error;
      }

      if (currentStep.status !== 'PENDING') {
        const error = new Error('Bước này không ở trạng thái chờ duyệt (PENDING).');
        error.statusCode = 409;
        throw error;
      }

      // Xử lý các hành động
      if (action === 'APPROVE') {
        await ApprovalStepModel.updateStatus(currentStep.id, 'PASSED', transaction);

        if (submission.current_step_order < submission.total_steps) {
          // Chưa phải bước cuối: Chuyển sang bước tiếp theo
          const nextOrder = submission.current_step_order + 1;
          await SubmissionModel.incrementStep(submissionId, nextOrder, transaction);
          await ApprovalStepModel.activateStep(submissionId, nextOrder, transaction);

          const nextStep = await ApprovalStepModel.findByOrderForUpdate(
            submissionId,
            nextOrder,
            transaction
          );

          await NotificationModel.create({
            user_id: nextStep.approver_id,
            submission_id: submissionId,
            action_by_id: userId,
            title: 'Hồ sơ mới chuyển đến bạn',
            content: `Tờ trình "${submissionDetail.title}" đã được duyệt qua cấp trước và chuyển đến bạn xử lý.`,
            type: 'ASSIGNED'
          }, transaction);
        } else {
          // Bước cuối cùng: Phê duyệt hoàn tất, đồng bộ mã document_code
          const finalDocCode = submissionDetail.document_code 
            ? `TT-${new Date().getFullYear()}-${submissionDetail.document_code.padStart(4, '0')}`
            : `TT-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

          await SubmissionModel.markApproved(submissionId, {
            docCode: finalDocCode,
            finalApproverId: userId
          }, transaction);

          await NotificationModel.create({
            user_id: submissionDetail.created_by_id,
            submission_id: submissionId,
            action_by_id: userId,
            title: 'Tờ trình đã được phê duyệt',
            content: `Tờ trình "${submissionDetail.title}" đã hoàn tất phê duyệt với số hiệu [${finalDocCode}].`,
            type: 'APPROVED'
          }, transaction);
        }
      } else if (action === 'RETURN') {
        await ApprovalStepModel.updateStatus(currentStep.id, 'RETURNED', transaction);
        await SubmissionModel.updateStatus(submissionId, 'RETURNED', transaction);

        await NotificationModel.create({
          user_id: submissionDetail.created_by_id,
          submission_id: submissionId,
          action_by_id: userId,
          title: 'Tờ trình bị trả về',
          content: `Tờ trình "${submissionDetail.title}" đã bị trả về yêu cầu chỉnh sửa, bổ sung.`,
          type: 'RETURNED'
        }, transaction);
      } else if (action === 'REJECT') {
        await ApprovalStepModel.updateStatus(currentStep.id, 'REJECTED', transaction);
        await SubmissionModel.updateStatus(submissionId, 'REJECTED', transaction);

        await NotificationModel.create({
          user_id: submissionDetail.created_by_id,
          submission_id: submissionId,
          action_by_id: userId,
          title: 'Tờ trình bị từ chối',
          content: `Tờ trình "${submissionDetail.title}" đã bị từ chối phê duyệt.`,
          type: 'REJECTED'
        }, transaction);
      }

      // Ghi nhận bình luận/lý do
      if (comment && comment.trim()) {
        await CommentModel.create({
          submission_id: submissionId,
          user_id: userId,
          content: comment.trim()
        }, transaction);
      }

      await transaction.commit();
      return { success: true, action };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  // 7. Chỉnh sửa và nộp lại tờ trình
  async resubmitSubmission(submissionId, payload, userId) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const submission = await SubmissionModel.findByIdForUpdate(submissionId, transaction);
      if (!submission) {
        const error = new Error('Tờ trình không tồn tại hoặc đã bị xoá.');
        error.statusCode = 404;
        throw error;
      }

      if (submission.status !== 'RETURNED') {
        const error = new Error(`Chỉ có thể gửi trình lại khi hồ sơ ở trạng thái RETURNED. Hiện tại: [${submission.status}].`);
        error.statusCode = 400;
        throw error;
      }

      if (submission.created_by_id.toLowerCase() !== userId.toLowerCase()) {
        const error = new Error('Bạn không phải là người tạo hồ sơ này nên không có quyền chỉnh sửa.');
        error.statusCode = 403;
        throw error;
      }

      await SubmissionModel.resubmit(submissionId, {
        title: payload.title,
        content: payload.content,
        category: payload.category,
        confidentiality: payload.confidentiality,
        priority: payload.priority
      }, transaction);

      await ApprovalStepModel.reactivateReturnedStep(
        submissionId,
        submission.current_step_order,
        transaction
      );

      await CommentModel.create({
        submission_id: submissionId,
        user_id: userId,
        content: `[Nộp lại hồ sơ cho Người duyệt bước ${submission.current_step_order}]: ${payload.resubmit_comment}`
      }, transaction);

      const targetStep = await ApprovalStepModel.findByOrderForUpdate(
        submissionId,
        submission.current_step_order,
        transaction
      );

      await NotificationModel.create({
        user_id: targetStep.approver_id,
        submission_id: submissionId,
        action_by_id: userId,
        title: 'Hồ sơ đã được nộp lại',
        content: `Người tạo đã cập nhật và nộp lại hồ sơ "${payload.title}".`,
        type: 'ASSIGNED'
      }, transaction);

      await transaction.commit();
      return { success: true };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  // 8. Xóa mềm tờ trình (Soft Delete)
  async deleteSubmission(submissionId, userId) {
    const pool = await poolPromise;
    const submission = await SubmissionModel.getDetail(submissionId, pool);

    if (!submission) {
      const error = new Error('Tờ trình không tồn tại.');
      error.statusCode = 404;
      throw error;
    }

    if (String(submission.created_by_id).toLowerCase() !== String(userId).toLowerCase()) {
      const error = new Error('Bạn không phải người tạo tờ trình này.');
      error.statusCode = 403;
      throw error;
    }

    const isDeletable = 
      ['DRAFT', 'RETURNED', 'REJECTED'].includes(submission.status) ||
      (submission.status === 'IN_PROGRESS' && submission.current_step_order === 1);

    if (!isDeletable) {
      const error = new Error('Không thể xoá tờ trình đang trong tiến trình phê duyệt các bước sau hoặc đã hoàn tất.');
      error.statusCode = 400;
      throw error;
    }

    await SubmissionModel.softDelete(submissionId, userId, pool);
    return { success: true, message: 'Đã xoá tờ trình thành công.' };
  },

  // 9. Chia sẻ tờ trình
  async shareSubmission(submissionId, payload, userId) {
    const { recipient_email, message } = payload;
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const recipient = await UserModel.findByEmail(recipient_email, transaction);
      if (!recipient) {
        const error = new Error('Không tìm thấy tài khoản nào sử dụng Email này trong hệ thống.');
        error.statusCode = 404;
        throw error;
      }

      if (recipient.id.toLowerCase() === userId.toLowerCase()) {
        const error = new Error('Bạn không thể tự chia sẻ tờ trình cho chính mình.');
        error.statusCode = 400;
        throw error;
      }

      const submissionDetail = await SubmissionModel.getDetail(submissionId, transaction);
      const submissionTitle = submissionDetail?.title || 'Tờ trình';

      const isAlreadyShared = await SubmissionViewerModel.checkExists(submissionId, recipient.id, transaction);
      if (!isAlreadyShared) {
        await SubmissionViewerModel.addViewer(submissionId, recipient.id, userId, transaction);
      }

      await NotificationModel.create({
        user_id: recipient.id,
        submission_id: submissionId,
        action_by_id: userId,
        title: 'Tờ trình được chia sẻ với bạn',
        content: message || `Bạn vừa được chia sẻ quyền xem tờ trình "${submissionTitle}".`,
        type: 'SHARED'
      }, transaction);

      await transaction.commit();
      return { success: true, recipientName: recipient.name };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  // 10. Danh sách được chia sẻ
  async getSharedSubmissions(userId) {
    const pool = await poolPromise;
    const data = await SubmissionModel.getSharedWithUser(userId, pool);
    return {
      total: data.length,
      data
    };
  },

  async getApprovedSubmissions(userId = null) {
    const pool = await poolPromise;
    // Truyền thẳng userId và pool vào Model
    const data = await SubmissionModel.getApprovedList(userId, pool);
    return {
      total: data.length,
      data
    };
  },

  // 12. Tìm kiếm
  async searchSubmissions(query) {
    if (!query || !query.trim()) {
      return [];
    }
    const pool = await poolPromise;
    const data = await SubmissionModel.search(query.trim(), pool);
    return data;
  },

  // 13. Danh sách nháp
  async getDraftSubmissions(userId) {
    const pool = await poolPromise;
    const data = await SubmissionModel.getDraftsByCreator(userId, pool);
    return { data };
  },

  // 14. Xuất bản từ bản nháp
  async publishDraft(submissionId, userId) {
    const pool = await poolPromise;
    const submission = await SubmissionModel.getDetail(submissionId, pool);

    if (!submission) {
      const err = new Error('Tờ trình không tồn tại.');
      err.statusCode = 404;
      throw err;
    }

    if (String(submission.created_by_id).toLowerCase() !== String(userId).toLowerCase()) {
      const err = new Error('Chỉ người tạo mới có quyền gửi tờ trình này.');
      err.statusCode = 403;
      throw err;
    }

    if (submission.status !== 'DRAFT') {
      const err = new Error('Tờ trình này không ở trạng thái bản nháp.');
      err.statusCode = 400;
      throw err;
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await SubmissionModel.publishDraft(submissionId, transaction);

      const steps = await ApprovalStepModel.getBySubmissionId(submissionId, transaction);
      const firstStep = steps.find(s => s.step_order === 1);
      if (firstStep) {
        await NotificationModel.create({
          user_id: firstStep.approver_id,
          submission_id: submissionId,
          type: 'PENDING',
          title: 'Tờ trình mới cần xử lý',
          content: `Hồ sơ "${submission.title}" đã được gửi và chuyển đến bạn duyệt.`,
          action_by_id: userId
        }, transaction);
      }

      await transaction.commit();
      return { success: true, message: 'Đã gửi tờ trình vào luồng phê duyệt thành công!' };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};

module.exports = SubmissionService;