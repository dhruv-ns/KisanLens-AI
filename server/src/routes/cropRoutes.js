const express = require('express');
const router = express.Router();
const { analyzeCrop, getCropHistory, getCropAnalysis } = require('../controllers/cropController');
const upload = require('../middleware/upload');
const { auth } = require('../middleware/auth');

const uploadMiddleware = upload.uploadCropMultimodal || upload.single('image');
router.post('/analyze', auth, uploadMiddleware, analyzeCrop);
router.get('/history', auth, getCropHistory);
router.get('/:id', auth, getCropAnalysis);

module.exports = router;
