// controllers/submission.controller.js
const SubmissionService = require('../services/submission.service');

const SubmissionController = {
  async create(req, res) {
    try {
      const { title, content, category, confidentiality, priority, steps } = req.body;
      const userId = req.user?.id;

      if (!title || !content) {
        return res.status(400).json({ error: 'Tiêu đề (title) và nội dung (content) không được để trống.' });
      }

      // Ngăn chặn lỗi tràn cột NVARCHAR(255) trong SQL Server (Fix PEN_TEST_05)
      if (typeof title === 'string' && title.length > 255) {
        return res.status(400).json({ error: 'Tiêu đề (title) không được vượt quá 255 ký tự.' });
      }

      if (!Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({ error: 'Quy trình phê duyệt cần ít nhất 1 người duyệt (steps).' });
      }

      const result = await SubmissionService.createSubmission(
        { title, content, category, confidentiality, priority, steps },
        userId
      );

      const submissionId = typeof result === 'object' && result !== null
        ? (result.submission_id || result.id)
        : result;

      const documentCode = typeof result === 'object' && result !== null
        ? result.document_code
        : null;

      return res.status(201).json({
        message: 'Khởi tạo tờ trình thành công.',
        submission_id: submissionId,
        ...(documentCode && { document_code: documentCode })
      });
    } catch (error) {
      console.error('[Create Submission Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || 'Lỗi hệ thống khi tạo tờ trình.'
      });
    }
  },
  async getPending(req, res) {
    try {
      const userId = req.user?.id; // Lấy ID của người đang gọi API từ Header/Token

      const tasks = await SubmissionService.getPendingList(userId);

      return res.status(200).json({
        total: tasks.length,
        data: tasks
      });
    } catch (error) {
      console.error('[Get Pending Submissions Error]:', error);
      return res.status(500).json({
        error: 'Lỗi khi tải danh sách công việc chờ xử lý.',
        details: error.message
      });
    }
  },
  async action(req, res) {
    try {
      const { id: submissionId } = req.params;
      const { action, comment } = req.body;
      const userId = req.user?.id;
      const allowedActions = ['APPROVE', 'RETURN', 'REJECT'];
      if (!allowedActions.includes(action)) {
        return res.status(400).json({
          error: 'Hành động không hợp lệ. Chỉ chấp nhận: APPROVE, RETURN, REJECT.'
        });
      }
      if ((action === 'RETURN' || action === 'REJECT') && (!comment || !comment.trim())) {
        return res.status(400).json({
          error: 'Bắt buộc phải nhập ý kiến / lý do khi chọn Trả về (RETURN) hoặc Từ chối (REJECT).'
        });
      }
      const result = await SubmissionService.executeAction({
        submissionId,
        action,
        comment,
        userId
      });

      return res.status(200).json({
        message: `Đã xử lý hồ sơ thành công với hành động: ${result.action}`
      });

    } catch (error) {
      console.error('[Action Submission Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || 'Lỗi hệ thống khi xử lý phê duyệt.'
      });
    }
  },
  async getDetail(req, res) {
    try {
      const { id } = req.params;

      const data = await SubmissionService.getSubmissionDetail(id);

      return res.status(200).json(data);
    } catch (error) {
      console.error('[Get Detail Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || 'Lỗi khi lấy thông tin chi tiết tờ trình.'
      });
    }
  },

  async resubmit(req, res) {
    try {
      const { id } = req.params;
      const { title, content, category, priority, confidentiality, resubmit_comment } = req.body;
      const userId = req.user?.id;

      if (!title || !content) {
        return res.status(400).json({ error: 'Tiêu đề và nội dung không được để trống.' });
      }

      if (!resubmit_comment || !resubmit_comment.trim()) {
        return res.status(400).json({
          error: 'Vui lòng nhập nội dung giải trình/phản hồi yêu cầu chỉnh sửa trước khi gửi trình lại.'
        });
      }

      await SubmissionService.resubmitSubmission(id, {
        title,
        content,
        category,
        priority,
        confidentiality,
        resubmit_comment
      }, userId);

      return res.status(200).json({
        message: 'Đã cập nhật và gửi trình lại hồ sơ thành công!'
      });
    } catch (error) {
      console.error('[Resubmit Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || 'Lỗi hệ thống khi gửi trình lại hồ sơ.'
      });
    }
  },

  async getMySubmissions(req, res) {
    try {
      const userId = req.user?.id;
      const result = await SubmissionService.getMySubmissions(userId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[Get My Submissions Error]:', error);
      return res.status(500).json({ error: 'Lỗi khi lấy danh sách tờ trình của tôi.' });
    }
  },
  async getProcessed(req, res) {
    try {
      const userId = req.user?.id;
      const result = await SubmissionService.getProcessedSubmissions(userId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[Get Processed Error]:', error);
      return res.status(500).json({ error: 'Lỗi khi lấy danh sách tờ trình đã xử lý.' });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      await SubmissionService.deleteSubmission(id, userId);

      return res.status(200).json({
        message: 'Đã xoá tờ trình thành công.'
      });
    } catch (error) {
      console.error('[Delete Submission Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || 'Lỗi khi xoá tờ trình.'
      });
    }
  },

  async share(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!req.body.recipient_email) {
        return res.status(400).json({ error: 'Vui lòng cung cấp email người nhận.' });
      }

      const result = await SubmissionService.shareSubmission(id, req.body, userId);
      
      return res.status(200).json({ 
        message: `Đã chia sẻ thành công cho ${result.recipientName}!` 
      });
    } catch (error) {
      console.error('[Share Error]:', error);
      return res.status(error.statusCode || 500).json({ 
        error: error.message || 'Lỗi khi chia sẻ tờ trình.' 
      });
    }
  },

  async getShared(req, res) {
    try {
      const userId = req.user?.id;
      const result = await SubmissionService.getSharedSubmissions(userId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[Get Shared Submissions Error]:', error);
      return res.status(500).json({ 
        error: 'Lỗi khi lấy danh sách tờ trình được chia sẻ.' 
      });
    }
  },

async getApproved(req, res) {
    try {
      const userId = req.user?.id || req.headers['x-user-id'];
      const isAdmin = req.user?.is_admin || false;

      if (!userId) {
        return res.status(401).json({ error: 'Không xác định được danh tính người dùng.' });
      }

      const result = await SubmissionService.getApprovedSubmissions(userId);

      return res.status(200).json(result);
    } catch (error) {
      console.error('[Get Approved Error]:', error);
      return res.status(500).json({ error: 'Lỗi khi lấy danh sách tờ trình đã phê duyệt.' });
    }
  },
  async search(req, res) {
    try {
      const { q } = req.query;
      const results = await SubmissionService.searchSubmissions(q);

      return res.status(200).json({ data: results });
    } catch (error) {
      console.error('[Search Submissions Error]:', error);
      return res.status(500).json({ 
        error: 'Lỗi khi tìm kiếm tờ trình.',
        details: error.message 
      });
    }
  },
async getDrafts(req, res) {
  try {
    const userId = req.user.id;
    const result = await SubmissionService.getDraftSubmissions(userId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
},

async publishDraft(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id; 
    const result = await SubmissionService.publishDraft(id, userId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}
};

module.exports = SubmissionController;