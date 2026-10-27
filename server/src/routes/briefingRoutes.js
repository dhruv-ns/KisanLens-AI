const express = require('express');
const router = express.Router();
const { getDailyBriefing } = require('../controllers/briefingController');
const { auth } = require('../middleware/auth');

// Support both GET and POST with optional authentication
router.get('/daily', auth, getDailyBriefing);
router.post('/daily', auth, getDailyBriefing);

module.exports = router;
