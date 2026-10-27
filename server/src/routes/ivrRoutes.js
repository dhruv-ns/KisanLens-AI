const express = require('express');
const multer = require('multer');
const router = express.Router();
const { getHelplineInfo, startCall, handleAction, handleWebhook } = require('../controllers/ivrController');

// Multer in-memory storage for handling noisy telephonic audio samples
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/info', getHelplineInfo);
router.post('/start', startCall);
router.post('/action', upload.single('audio'), handleAction);
router.post('/webhook', handleWebhook);
router.get('/webhook', handleWebhook);

module.exports = router;
