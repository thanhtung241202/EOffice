const express = require('express');
const router = express.Router();
const multer = require('multer');
const AttachmentController = require('../controllers/attachment.controller');
// Giả định bạn có middleware xác thực JWT
// const authMiddleware = require('../middlewares/auth.middleware');

// Cấu hình Multer nhận file lưu vào memory RAM (giới hạn tối đa 25MB mỗi file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// 1. Tải 1 hoặc nhiều file đính kèm cho tờ trình (Field name gửi lên từ FormData là: files)
router.post('/submissions/:submissionId/attachments', /* authMiddleware, */ upload.array('files', 5), AttachmentController.upload);

// 2. Lấy Signed URL tải file theo ID attachment
router.get('/attachments/:id/download', /* authMiddleware, */ AttachmentController.getDownloadUrl);

// 3. Xóa file đính kèm
router.delete('/attachments/:id', /* authMiddleware, */ AttachmentController.delete);

module.exports = router;