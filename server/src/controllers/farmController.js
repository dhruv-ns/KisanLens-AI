const Farm = require('../models/Farm');
const { generateFarmAdvice } = require('../services/farmAdviceService');
const CropAnalysis = require('../models/CropAnalysis');
const { isDBConnected } = require('../config/database');

/**
 * GET /api/farm
 */
async function getFarm(req, res, next) {
  try {
    if (!isDBConnected()) {
      return res.json({ success: true, data: null });
    }
    const query = req.userId ? { userId: req.userId } : { userId: null };
    const farm = await Farm.findOne(query).sort({ updatedAt: -1 }).maxTimeMS(5000).lean();
    if (!farm) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: farm });
  } catch (error) {
    // Graceful degradation: return null farm when DB is down
    res.json({ success: true, data: null });
  }
}

/**
 * POST /api/farm
 */
async function createFarm(req, res, next) {
  try {
    if (!isDBConnected()) {
      return res.json({ success: true, data: req.body, _local: true });
    }
    const city = req.body.city || req.body.location?.city || '';
    const state = req.body.state || req.body.location?.state || '';
    const district = req.body.district || req.body.location?.district || city;

    const farmData = {
      userId: req.userId || null,
      farmName: req.body.farmName || 'My Farm',
      city,
      state,
      location: {
        city,
        state,
        district,
      },
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      area: req.body.area,
      areaUnit: req.body.areaUnit || 'acres',
      crop: req.body.crop,
      cropStage: req.body.cropStage || '',
      soilType: req.body.soilType || '',
    };

    const farm = new Farm(farmData);
    await farm.save();

    res.status(201).json({ success: true, data: farm });
  } catch (error) {
    // Return data even if DB save fails — client stores locally
    res.json({ success: true, data: req.body, _local: true });
  }
}

/**
 * PUT /api/farm
 */
async function updateFarm(req, res, next) {
  try {
    if (!isDBConnected()) {
      return res.json({ success: true, data: req.body, _local: true });
    }
    const farmId = req.body._id || req.body.farmId || req.params.id;
    const query = farmId
      ? { _id: farmId }
      : (req.userId ? { userId: req.userId } : { userId: null });

    let farm = await Farm.findOne(query).sort({ updatedAt: -1 }).maxTimeMS(5000);

    const city = req.body.city || req.body.location?.city || farm?.city || farm?.location?.city || '';
    const state = req.body.state || req.body.location?.state || farm?.state || farm?.location?.state || '';
    const district = req.body.district || req.body.location?.district || city || farm?.location?.district || '';

    const updates = {
      ...req.body,
      city,
      state,
      location: {
        city,
        state,
        district,
      },
    };

    if (!farm) {
      farm = new Farm({ userId: req.userId || null, ...updates });
    } else {
      Object.assign(farm, updates);
    }

    await farm.save();
    res.json({ success: true, data: farm });
  } catch (error) {
    res.json({ success: true, data: req.body, _local: true });
  }
}

/**
 * POST /api/farm/advice
 */
async function getFarmAdvice(req, res, next) {
  try {
    const { crop, cropStage, latitude, longitude } = req.body;

    // Get latest crop analysis if available and DB is connected
    let cropAnalysis = null;
    if (req.userId && isDBConnected()) {
      try {
        cropAnalysis = await CropAnalysis.findOne({ userId: req.userId })
          .sort({ createdAt: -1 }).maxTimeMS(5000).lean();
      } catch { /* ignore */ }
    }

    const advice = await generateFarmAdvice({
      crop: crop || 'Unknown',
      cropStage: cropStage || '',
      latitude: parseFloat(latitude) || null,
      longitude: parseFloat(longitude) || null,
      cropAnalysis,
    });

    res.json({ success: true, data: advice });
  } catch (error) {
    next(error);
  }
}

module.exports = { getFarm, createFarm, updateFarm, getFarmAdvice };
