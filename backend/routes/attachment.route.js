const express = require('express');
const router = express.Router();
const multer = require('multer');
const AttachmentController = require('../controllers/attachment.controller');
// const authMiddleware = require('../middlewares/auth.middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

router.post('/submissions/:submissionId/attachments', /* authMiddleware, */ upload.array('files', 5), AttachmentController.upload);

router.get('/attachments/:id/download', /* authMiddleware, */ AttachmentController.getDownloadUrl);

router.delete('/attachments/:id', /* authMiddleware, */ AttachmentController.delete);

module.exports = router;