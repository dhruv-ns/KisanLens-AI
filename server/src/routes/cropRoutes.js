const express = require('express');
const router = express.Router();
const { analyzeCrop, getCropHistory, getCropAnalysis } = require('../controllers/cropController');
const upload = require('../middleware/upload');
const { auth } = require('../middleware/auth');

router.post('/analyze', auth, upload.single('image'), analyzeCrop);
router.get('/history', auth, getCropHistory);
router.get('/:id', auth, getCropAnalysis);

module.exports = router;
