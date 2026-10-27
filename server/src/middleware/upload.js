const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}${ext || (file.fieldname === 'audio' ? '.wav' : '.jpg')}`;
    cb(null, safeName);
  },
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_AUDIO_TYPES = [
  'audio/wav', 'audio/wave', 'audio/x-wav',
  'audio/webm', 'audio/ogg', 'audio/opus',
  'audio/mpeg', 'audio/mp3', 'audio/m4a', 'audio/mp4', 'audio/aac'
];

// Single image file filter (backward compatibility)
const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid image file type: ${file.mimetype}. Allowed: JPEG, PNG, WEBP`), false);
  }
};

// Multimodal file filter (allows image + optional audio voice note)
const multimodalFilter = (req, file, cb) => {
  if (file.fieldname === 'image') {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype.toLowerCase())) {
      return cb(null, true);
    }
    return cb(new Error(`Invalid image type: ${file.mimetype}. Allowed: JPEG, PNG, WEBP`), false);
  }

  if (file.fieldname === 'audio' || file.fieldname === 'voiceNote') {
    if (ALLOWED_AUDIO_TYPES.includes(file.mimetype.toLowerCase()) || file.mimetype.startsWith('audio/')) {
      return cb(null, true);
    }
    return cb(new Error(`Invalid audio type: ${file.mimetype}. Allowed: WAV, WEBM, MP3, OGG`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1,
  },
});

const uploadCropMultimodal = multer({
  storage,
  fileFilter: multimodalFilter,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]);

module.exports = upload;
module.exports.uploadCropMultimodal = uploadCropMultimodal;
