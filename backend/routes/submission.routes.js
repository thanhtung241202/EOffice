const express = require('express');
const router = express.Router();
const SubmissionController = require('../controllers/submission.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

router.post('/', SubmissionController.create);
router.get('/pending', SubmissionController.getPending);
router.get('/my-submissions', SubmissionController.getMySubmissions);
router.get('/processed', SubmissionController.getProcessed);
router.get('/shared', SubmissionController.getShared);
router.get('/approved', SubmissionController.getApproved);
router.get('/search', SubmissionController.search);
router.get('/drafts', SubmissionController.getDrafts);

router.post('/:id/publish', SubmissionController.publishDraft);
router.delete('/:id', SubmissionController.delete);
router.post('/:id/action', SubmissionController.action);
router.put('/:id/resubmit', SubmissionController.resubmit);
router.get('/:id', SubmissionController.getDetail);
router.post('/:id/share', SubmissionController.share);

module.exports = router;