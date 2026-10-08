const express = require('express');
const router = express.Router();
const { sendMessage, clearHistory } = require('../controllers/assistantController');
const { auth } = require('../middleware/auth');

router.post('/message', auth, sendMessage);
router.delete('/history', auth, clearHistory);

module.exports = router;
