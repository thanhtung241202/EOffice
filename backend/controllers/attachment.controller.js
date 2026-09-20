const AttachmentService = require('../services/attachment.service');

const AttachmentController = {
  // Upload nhiều file đính kèm
  async upload(req, res) {
    try {
      const { submissionId } = req.params;
      // Lấy userId từ req.user (nếu có middleware) HOẶC lấy từ custom header 'x-user-id'
      const userId = req.user?.id || req.headers['x-user-id'] || req.body.userId;
      const files = req.files;

      if (!userId) {
        return res.status(401).json({ error: 'Không xác định được danh tính người dùng (thiếu user ID).' });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Vui lòng chọn ít nhất một tập tin để tải lên.' });
      }

      const result = await AttachmentService.uploadAttachments(submissionId, files, userId);

      return res.status(201).json({
        message: 'Tải tài liệu đính kèm thành công!',
        data: result
      });
    } catch (error) {
      console.error('[Upload Attachment Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || 'Lỗi hệ thống khi tải tài liệu đính kèm.'
      });
    }
  },

  // Lấy link xem / tải file
  async getDownloadUrl(req, res) {
    try {
      const { id } = req.params;
      const result = await AttachmentService.getDownloadUrl(id);

      return res.status(200).json(result);
    } catch (error) {
      console.error('[Get Download URL Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || 'Lỗi khi lấy link tải tài liệu.'
      });
    }
  },

  // Xóa tài liệu đính kèm
  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.headers['x-user-id'] || req.body.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Không xác định được danh tính người dùng.' });
      }

      await AttachmentService.deleteAttachment(id, userId);

      return res.status(200).json({ message: 'Xóa tài liệu đính kèm thành công.' });
    } catch (error) {
      console.error('[Delete Attachment Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.message || 'Lỗi khi xóa tài liệu.'
      });
    }
  }
};

module.exports = AttachmentController;