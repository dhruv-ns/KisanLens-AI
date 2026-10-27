const { searchLocation, getWeather, getWeatherAdvisory, generateFallbackWeather } = require('../services/weatherService');
const logger = require('../utils/logger');

/**
 * GET /api/weather/current?lat=&lon=
 */
async function getCurrentWeather(req, res) {
  const { lat, lon } = req.query;
  const latitude = parseFloat(lat) || 28.6139;
  const longitude = parseFloat(lon) || 77.2090;

  try {
    const weather = await getWeather(latitude, longitude);
    const advisory = getWeatherAdvisory(weather);
    res.json({ success: true, data: { ...weather, advisory } });
  } catch (error) {
    logger.warn('Weather fetch fallback triggered in controller:', error.message);
    const fallback = generateFallbackWeather(latitude, longitude);
    const advisory = getWeatherAdvisory(fallback);
    res.json({ success: true, data: { ...fallback, advisory } });
  }
}

/**
 * GET /api/weather/forecast?lat=&lon=
 */
async function getForecast(req, res) {
  const { lat, lon } = req.query;
  const latitude = parseFloat(lat) || 28.6139;
  const longitude = parseFloat(lon) || 77.2090;

  try {
    const weather = await getWeather(latitude, longitude);
    res.json({ success: true, data: weather });
  } catch (error) {
    logger.warn('Forecast fetch fallback triggered in controller:', error.message);
    const fallback = generateFallbackWeather(latitude, longitude);
    res.json({ success: true, data: fallback });
  }
}

/**
 * GET /api/weather/location?q=
 */
async function getLocation(req, res) {
  try {
    const { q } = req.query;
    const query = q && q.trim().length >= 1 ? q.trim() : 'Delhi';
    const results = await searchLocation(query);
    res.json({ success: true, data: results });
  } catch (error) {
    logger.warn('Location search fallback triggered:', error.message);
    res.json({
      success: true,
      data: [{ name: 'Delhi', state: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090 }],
    });
  }
}

module.exports = { getCurrentWeather, getForecast, getLocation };
