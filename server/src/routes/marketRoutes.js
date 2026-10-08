const express = require('express');
const router = express.Router();
const { getMarket, getTrend, getMarketOptions } = require('../controllers/marketController');

router.get('/', getMarket);
router.get('/trend', getTrend);
router.get('/options', getMarketOptions);

module.exports = router;
