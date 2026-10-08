const express = require('express');
const router = express.Router();
const { getFarm, createFarm, updateFarm, getFarmAdvice } = require('../controllers/farmController');
const { auth } = require('../middleware/auth');

router.get('/', auth, getFarm);
router.post('/', auth, createFarm);
router.put('/', auth, updateFarm);
router.post('/advice', auth, getFarmAdvice);

module.exports = router;
