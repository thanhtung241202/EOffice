// routes/submission.routes.js
const express = require('express');
const router = express.Router();
const SubmissionController = require('../controllers/submission.controller');

const mockAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Vui lòng cung cấp x-user-id qua header.' });
  }
  req.user = { id: userId };
  next();
};

// 1. CÁC ROUTE TĨNH 
router.post('/', mockAuth, SubmissionController.create);
router.get('/pending', mockAuth, SubmissionController.getPending);
router.get('/my-submissions', mockAuth, SubmissionController.getMySubmissions);
router.get('/processed', mockAuth, SubmissionController.getProcessed);
router.get('/shared', mockAuth, SubmissionController.getShared);
router.get('/approved', SubmissionController.getApproved);
// 2. CÁC ROUTE ĐỘNG CÓ THAM SỐ :id 
//router.post('/:id/share', mockAuth, SubmissionController.share);
router.delete('/:id', mockAuth, SubmissionController.delete);
router.post('/:id/action', mockAuth, SubmissionController.action);
router.put('/:id/resubmit', mockAuth, SubmissionController.resubmit);
router.get('/:id', mockAuth, SubmissionController.getDetail);
router.post('/:id/share', mockAuth, SubmissionController.share);
module.exports = router;