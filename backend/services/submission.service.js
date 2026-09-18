// services/submission.service.js
const { sql, poolPromise } = require('../config/db');
const SubmissionModel = require('../models/submission.model');
const ApprovalStepModel = require('../models/approvalStep.model');
const CommentModel = require('../models/comment.model');
const NotificationModel = require('../models/notification.model');
const SubmissionViewerModel = require('../models/submissionViewer.model');
const UserModel = require('../models/user.model');
const SubmissionService = {
  // 1. Tạo mới tờ trình kèm các bước phê duyệt & thông báo cho Bước 1
  async createSubmission(payload, userId) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const { title, content, category, confidentiality, priority, steps } = payload;

      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        const error = new Error('Hồ sơ tờ trình bắt buộc phải có ít nhất một bước phê duyệt.');
        error.statusCode = 400;
        throw error;
      }

      // Tạo bản ghi submission
      const submissionId = await SubmissionModel.create({
        title,
        content,
        category,
        confidentiality,
        priority,
        total_steps: steps.length,
        created_by_id: userId
      }, transaction);

      // Tạo các bước duyệt
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepOrder = i + 1;
        const initialStatus = stepOrder === 1 ? 'PENDING' : 'WAITING';

        await ApprovalStepModel.create({
          submission_id: submissionId,
          approver_id: step.approver_id,
          step_order: stepOrder,
          step_role: step.step_role || 'APPROVER',
          status: initialStatus
        }, transaction);
      }

      // TỰ ĐỘNG THÔNG BÁO: Báo cho người duyệt bước 1 có hồ sơ mới đến
      await NotificationModel.create({
        user_id: steps[0].approver_id,
        submission_id: submissionId,
        action_by_id: userId,
        title: 'Hồ sơ mới cần xử lý',
        content: `Đồng chí vừa được phân công xử lý tờ trình "${title}".`,
        type: 'ASSIGNED'
      }, transaction);

      await transaction.commit();
      return { submission_id: submissionId };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  // 2. Lấy danh sách hồ sơ cần xử lý của Approver hiện tại
  async getPendingList(userId) {
    const pool = await poolPromise;
    const data = await ApprovalStepModel.getPendingByApprover(userId, pool);
    return {
      total: data.length,
      data
    };
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

    return {
      submission,
      approval_steps,
      comments
    };
  },

  // 6. Xử lý hành động phê duyệt (APPROVE / RETURN / REJECT) & Bắn thông báo tương ứng
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

      // Phân loại xử lý theo hành động
      if (action === 'APPROVE') {
        await ApprovalStepModel.updateStatus(currentStep.id, 'PASSED', transaction);

        if (submission.current_step_order < submission.total_steps) {
          // Chưa phải bước cuối: Chuyển sang bước kế tiếp
          const nextOrder = submission.current_step_order + 1;
          await SubmissionModel.incrementStep(submissionId, nextOrder, transaction);
          await ApprovalStepModel.activateStep(submissionId, nextOrder, transaction);

          // Lấy thông tin người duyệt bước tiếp theo
          const nextStep = await ApprovalStepModel.findByOrderForUpdate(
            submissionId,
            nextOrder,
            transaction
          );

          // TỰ ĐỘNG THÔNG BÁO: Báo cho người bước tiếp theo
          await NotificationModel.create({
            user_id: nextStep.approver_id,
            submission_id: submissionId,
            action_by_id: userId,
            title: 'Hồ sơ mới chuyển đến bạn',
            content: `Tờ trình "${submissionDetail.title}" đã được duyệt qua cấp trước và chuyển đến bạn xử lý.`,
            type: 'ASSIGNED'
          }, transaction);
        } else {
          // Là bước duyệt cuối cùng: Ký duyệt hoàn tất và cấp mã văn bản
          const generatedDocCode = `TT-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
          await SubmissionModel.markApproved(submissionId, {
            docCode: generatedDocCode,
            finalApproverId: userId
          }, transaction);

          // TỰ ĐỘNG THÔNG BÁO: Báo cho Người tạo biết hồ sơ đã được duyệt hoàn tất
          await NotificationModel.create({
            user_id: submissionDetail.created_by_id,
            submission_id: submissionId,
            action_by_id: userId,
            title: 'Tờ trình đã được phê duyệt',
            content: `Tờ trình "${submissionDetail.title}" đã hoàn tất phê duyệt với số hiệu [${generatedDocCode}].`,
            type: 'APPROVED'
          }, transaction);
        }
      } else if (action === 'RETURN') {
        await ApprovalStepModel.updateStatus(currentStep.id, 'RETURNED', transaction);
        await SubmissionModel.updateStatus(submissionId, 'RETURNED', transaction);

        // TỰ ĐỘNG THÔNG BÁO: Báo cho Người tạo biết hồ sơ bị trả về
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

        // TỰ ĐỘNG THÔNG BÁO: Báo cho Người tạo biết hồ sơ bị từ chối
        await NotificationModel.create({
          user_id: submissionDetail.created_by_id,
          submission_id: submissionId,
          action_by_id: userId,
          title: 'Tờ trình bị từ chối',
          content: `Tờ trình "${submissionDetail.title}" đã bị từ chối phê duyệt.`,
          type: 'REJECTED'
        }, transaction);
      }

      // Lưu ý kiến / lý do thao tác
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

  // 7. Chỉnh sửa và nộp lại tờ trình (Gửi thẳng lại người thứ 3 đã trả về & Báo notification)
  async resubmitSubmission(submissionId, payload, userId) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Khóa và kiểm tra tờ trình
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

      // Kiểm tra thẩm quyền người tạo
      if (submission.created_by_id.toLowerCase() !== userId.toLowerCase()) {
        const error = new Error('Bạn không phải là người tạo hồ sơ này nên không có quyền chỉnh sửa.');
        error.statusCode = 403;
        throw error;
      }

      // Cập nhật thông tin tờ trình (giữ nguyên current_step_order, đưa status về IN_PROGRESS)
      await SubmissionModel.resubmit(submissionId, {
        title: payload.title,
        content: payload.content,
        category: payload.category,
        confidentiality: payload.confidentiality,
        priority: payload.priority
      }, transaction);

      // Kích hoạt lại đúng bước đang bị RETURNED
      await ApprovalStepModel.reactivateReturnedStep(
        submissionId,
        submission.current_step_order,
        transaction
      );

      // Bắt buộc ghi nhận nội dung giải trình của người tạo
      await CommentModel.create({
        submission_id: submissionId,
        user_id: userId,
        content: `[Nộp lại hồ sơ cho Người duyệt bước ${submission.current_step_order}]: ${payload.resubmit_comment}`
      }, transaction);

      // Lấy approver của bước đang chờ duyệt lại để gửi thông báo
      const targetStep = await ApprovalStepModel.findByOrderForUpdate(
        submissionId,
        submission.current_step_order,
        transaction
      );

      // TỰ ĐỘNG THÔNG BÁO: Báo cho Người duyệt bước đó biết hồ sơ đã được nộp lại
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
      const error = new Error('Tờ trình không tồn tại hoặc đã bị xoá trước đó.');
      error.statusCode = 404;
      throw error;
    }

    if (submission.created_by_id.toLowerCase() !== userId.toLowerCase()) {
      const error = new Error('Bạn không có quyền xoá tờ trình của người khác.');
      error.statusCode = 403;
      throw error;
    }

    // Không cho phép xoá tờ trình đã hoàn tất phê duyệt hoặc đã có kết luận từ chối
    if (['APPROVED', 'REJECTED'].includes(submission.status)) {
      const error = new Error(`Không thể xoá hồ sơ đã ở trạng thái [${submission.status}].`);
      error.statusCode = 400;
      throw error;
    }

    // Nếu đang trong chu trình nhưng đã duyệt qua bước 1 thì không cho tự ý xoá
    if (submission.status === 'IN_PROGRESS' && submission.current_step_order > 1) {
      const error = new Error('Hồ sơ đã được các cấp trước xem xét và phê duyệt, không thể tự ý xoá.');
      error.statusCode = 400;
      throw error;
    }

    await SubmissionModel.softDelete(submissionId, userId, pool);
    return { success: true };
  },

  async shareSubmission(submissionId, payload, userId) {
    const { recipient_email, message } = payload;
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 1. Tìm user đích bằng email qua Model
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

      // 2. Lấy chi tiết tờ trình qua Model (Sử dụng hàm getDetail đã có sẵn)
      const submissionDetail = await SubmissionModel.getDetail(submissionId, transaction);
      const submissionTitle = submissionDetail?.title || 'Tờ trình';

      // 3. Kiểm tra và lưu quyền xem qua Model
      const isAlreadyShared = await SubmissionViewerModel.checkExists(submissionId, recipient.id, transaction);
      
      if (!isAlreadyShared) {
        await SubmissionViewerModel.addViewer(submissionId, recipient.id, userId, transaction);
      }

      // 4. Bắn thông báo qua Model
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
  async getSharedSubmissions(userId) {
    const pool = await poolPromise;
    const data = await SubmissionModel.getSharedWithUser(userId, pool);
    return {
      total: data.length,
      data
    };
  },
};

module.exports = SubmissionService;