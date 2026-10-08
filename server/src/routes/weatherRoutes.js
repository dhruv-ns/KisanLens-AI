const express = require('express');
const router = express.Router();
const { getCurrentWeather, getForecast, getLocation } = require('../controllers/weatherController');

router.get('/current', getCurrentWeather);
router.get('/forecast', getForecast);
router.get('/location', getLocation);

module.exports = router;
