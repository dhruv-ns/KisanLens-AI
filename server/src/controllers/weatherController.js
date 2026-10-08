const { searchLocation, getWeather, getWeatherAdvisory } = require('../services/weatherService');
const logger = require('../utils/logger');

/**
 * GET /api/weather/current?lat=&lon=
 */
async function getCurrentWeather(req, res, next) {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude are required.' });
    }
    const weather = await getWeather(parseFloat(lat), parseFloat(lon));
    const advisory = getWeatherAdvisory(weather);
    res.json({ success: true, data: { ...weather, advisory } });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/weather/forecast?lat=&lon=
 */
async function getForecast(req, res, next) {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude are required.' });
    }
    const weather = await getWeather(parseFloat(lat), parseFloat(lon));
    res.json({ success: true, data: weather });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/weather/location?q=
 */
async function getLocation(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, error: 'Search query must be at least 2 characters.' });
    }
    const results = await searchLocation(q);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
}

module.exports = { getCurrentWeather, getForecast, getLocation };
