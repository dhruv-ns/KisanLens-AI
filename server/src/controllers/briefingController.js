const { generateDailyBriefing } = require('../services/briefingService');
const Farm = require('../models/Farm');
const { isDBConnected } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET or POST /api/briefing/daily
 * Generates personalized daily code-mixed audio briefing ("Kisan Vani")
 * Targets Mixed Vibes Award using natural conversational Hinglish + Gnani Timbre TTS
 */
async function getDailyBriefing(req, res, next) {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const languageStyle = params.languageStyle || params.language || 'hinglish';

    let farm = {
      crop: params.crop || 'Tomato',
      farmName: params.farmName || 'My Farm',
      city: params.city || 'Karnal',
      state: params.state || 'Haryana',
      latitude: params.latitude ? parseFloat(params.latitude) : 29.6857,
      longitude: params.longitude ? parseFloat(params.longitude) : 76.9905,
      area: params.area ? parseFloat(params.area) : 3,
      cropStage: params.cropStage || 'Vegetative / Growth',
    };

    // If user is authenticated and DB is connected, fetch their primary farm profile
    if (req.userId && isDBConnected() && !params.forceParams) {
      try {
        const userFarm = await Farm.findOne({ userId: req.userId }).sort({ updatedAt: -1 });
        if (userFarm) {
          farm = {
            crop: userFarm.crop || farm.crop,
            farmName: userFarm.farmName || farm.farmName,
            city: userFarm.location?.city || farm.city,
            state: userFarm.location?.state || farm.state,
            latitude: userFarm.latitude || farm.latitude,
            longitude: userFarm.longitude || farm.longitude,
            area: userFarm.area || farm.area,
            cropStage: userFarm.cropStage || farm.cropStage,
          };
          logger.info(`[Daily Briefing] Loaded farm profile for user ${req.userId}: ${farm.farmName} (${farm.crop})`);
        }
      } catch (dbErr) {
        logger.warn('[Daily Briefing] DB farm lookup failed, using fallback farm:', dbErr.message);
      }
    }

    const briefing = await generateDailyBriefing(farm, languageStyle);

    res.status(200).json({
      success: true,
      data: briefing,
    });
  } catch (error) {
    logger.error('[Daily Briefing] Controller error:', error.message);
    next(error);
  }
}

module.exports = {
  getDailyBriefing,
};
