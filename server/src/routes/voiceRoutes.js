const express = require('express');
const multer = require('multer');
const router = express.Router();
const { transcribe, synthesize, voiceChat, status } = require('../controllers/voiceController');
const { auth } = require('../middleware/auth');

// Multer config: store audio in memory buffer (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/mpeg', 'audio/mp3',
      'audio/ogg', 'audio/opus',
      'audio/webm',
      'audio/flac',
      'audio/aac', 'audio/m4a', 'audio/mp4',
    ];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}`), false);
    }
  },
});

// POST /api/voice/transcribe — Upload audio → get text
router.post('/transcribe', auth, upload.single('audio'), transcribe);

// POST /api/voice/synthesize — Send text → get audio
router.post('/synthesize', auth, synthesize);

// POST /api/voice/chat — Full pipeline: audio/text → AI response + optional audio
router.post('/chat', auth, upload.single('audio'), voiceChat);

// GET /api/voice/status — Check voice service availability
router.get('/status', status);

module.exports = router;
