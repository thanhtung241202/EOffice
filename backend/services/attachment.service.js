const supabase = require('../config/supabase');
const { poolPromise } = require('../config/db');
const AttachmentModel = require('../models/attachment.model');
const SubmissionModel = require('../models/submission.model');

const BUCKET_NAME = 'New Documents';

const AttachmentService = {
  // 1. Upload nhiều file đính kèm cho một Submission
  async uploadAttachments(submissionId, files, userId) {
    const pool = await poolPromise;

    // Kiểm tra tờ trình có tồn tại không
    const submission = await SubmissionModel.getDetail(submissionId, pool);
    if (!submission) {
      const error = new Error('Tờ trình không tồn tại hoặc đã bị xoá.');
      error.statusCode = 404;
      throw error;
    }

    // Xử lý an toàn tránh văng lỗi khi userId hoặc created_by_id bị undefined/null
    const creatorId = String(submission.created_by_id || '').toLowerCase();
    const currentId = String(userId || '').toLowerCase();

    if (!currentId) {
      const error = new Error('Không xác định được danh tính người dùng (thiếu User ID).');
      error.statusCode = 401;
      throw error;
    }

    // Chỉ cho phép người tạo bổ sung tài liệu
    if (creatorId !== currentId) {
      const error = new Error('Bạn không có quyền đính kèm file vào tờ trình này.');
      error.statusCode = 403;
      throw error;
    }

    const uploadedRecords = [];

    for (const file of files) {
      // Decode tên file tiếng Việt nếu bị lỗi font mã hóa Latin1 từ multer
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const ext = originalName.split('.').pop();
      const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e4)}.${ext}`;
      
      // Đường dẫn theo cấu trúc phân quyền: <userId>/<submissionId>/<uniqueFileName>
      const storagePath = `${currentId}/${submissionId}/${uniqueFileName}`;

      // Upload lên Supabase Storage qua Buffer (dùng service role key)
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Lỗi tải file lên Supabase: ${uploadError.message}`);
      }

      // Lưu metadata vào DB SQL Server
      const record = await AttachmentModel.create({
        submission_id: submissionId,
        file_name: originalName,
        file_path: storagePath,
        file_size: file.size
      }, pool);

      uploadedRecords.push(record);
    }

    return uploadedRecords;
  },

  // 2. Lấy link tải / xem file (Signed URL 60 giây)
  async getDownloadUrl(attachmentId) {
    const pool = await poolPromise;
    const fileRecord = await AttachmentModel.findById(attachmentId, pool);
    if (!fileRecord) {
      const error = new Error('Không tìm thấy tài liệu đính kèm.');
      error.statusCode = 404;
      throw error;
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileRecord.file_path, 60); // Link hết hạn sau 60s

    if (error) {
      throw new Error(`Lỗi tạo đường dẫn tải: ${error.message}`);
    }

    return {
      file_name: fileRecord.file_name,
      download_url: data.signedUrl
    };
  },

  // 3. Xóa file đính kèm (Xóa cả trên Supabase và SQL Server)
  async deleteAttachment(attachmentId, userId) {
    const pool = await poolPromise;
    const fileRecord = await AttachmentModel.findById(attachmentId, pool);
    if (!fileRecord) {
      const error = new Error('Tài liệu đính kèm không tồn tại.');
      error.statusCode = 404;
      throw error;
    }

    // Kiểm tra quyền từ submission
    const submission = await SubmissionModel.getDetail(fileRecord.submission_id, pool);
    if (!submission) {
      const error = new Error('Tờ trình chứa tệp này không tồn tại.');
      error.statusCode = 404;
      throw error;
    }

    const creatorId = String(submission.created_by_id || '').toLowerCase();
    const currentId = String(userId || '').toLowerCase();

    if (!currentId) {
      const error = new Error('Không xác định được danh tính người dùng.');
      error.statusCode = 401;
      throw error;
    }

    if (creatorId !== currentId) {
      const error = new Error('Bạn không có quyền xóa tệp đính kèm này.');
      error.statusCode = 403;
      throw error;
    }

    // Xóa trên Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileRecord.file_path]);

    if (storageError) {
      console.warn('Lỗi khi xóa file vật lý trên Supabase:', storageError.message);
    }

    // Xóa record trong SQL Server
    await AttachmentModel.deleteById(attachmentId, pool);
    return { success: true };
  }
};

module.exports = AttachmentService;