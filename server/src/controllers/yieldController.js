const { getMetadata, predictCropYield, rankCropsForClimate } = require('../services/yieldService');

/**
 * GET /api/yield/metadata
 */
function getYieldMetadata(req, res) {
  const meta = getMetadata();
  if (!meta) {
    return res.status(503).json({ success: false, error: 'Yield model metadata not loaded' });
  }

  res.json({
    success: true,
    data: {
      dataset_info: meta.dataset_info,
      crops: meta.crops,
      countries: meta.countries,
      model_metrics: meta.model_metrics,
    },
  });
}

/**
 * POST /api/yield/predict
 */
async function predictYield(req, res, next) {
  try {
    const { crop, country, rainfall, temperature, pesticides, farmArea } = req.body;

    if (!crop) {
      return res.status(400).json({ success: false, error: 'Crop name is required.' });
    }

    const prediction = await predictCropYield({
      crop,
      country: country || 'India',
      rainfall,
      temperature,
      pesticides,
      farmArea,
    });

    res.json({
      success: true,
      data: prediction,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/yield/recommendations
 */
async function getRecommendations(req, res, next) {
  try {
    const { country, rainfall, temperature, farmArea } = req.query;

    const ranked = await rankCropsForClimate({
      country: country || 'India',
      rainfall: parseFloat(rainfall) || 1000,
      temperature: parseFloat(temperature) || 25,
      farmArea: parseFloat(farmArea) || 1,
    });

    res.json({
      success: true,
      data: ranked,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/yield/trend/:crop
 */
function getCropTrend(req, res) {
  const { crop } = req.params;
  const meta = getMetadata();
  const trend = meta?.historical_trends?.[crop] || [];
  const stats = meta?.crop_stats?.[crop] || null;

  res.json({
    success: true,
    data: {
      crop,
      stats,
      trend,
    },
  });
}

module.exports = {
  getYieldMetadata,
  predictYield,
  getRecommendations,
  getCropTrend,
};
