const express = require('express');
const router = express.Router();
const {
  getYieldMetadata,
  predictYield,
  getRecommendations,
  getCropTrend,
} = require('../controllers/yieldController');

router.get('/metadata', getYieldMetadata);
router.post('/predict', predictYield);
router.get('/recommendations', getRecommendations);
router.get('/trend/:crop', getCropTrend);

module.exports = router;
