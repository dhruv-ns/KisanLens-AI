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
      crop: params.crop || 'Wheat',
      farmName: params.farmName || 'My Farm',
      city: params.city || 'Indore',
      state: params.state || 'Madhya Pradesh',
      latitude: params.latitude ? parseFloat(params.latitude) : null,
      longitude: params.longitude ? parseFloat(params.longitude) : null,
      area: params.area ? parseFloat(params.area) : 3,
      cropStage: params.cropStage || 'Vegetative Growth',
    };

    // If user is authenticated and DB is connected, merge their primary farm profile
    if (req.userId && isDBConnected() && !params.forceParams) {
      try {
        const userFarm = await Farm.findOne({ userId: req.userId }).sort({ updatedAt: -1 });
        if (userFarm) {
          farm = {
            crop: params.crop || userFarm.crop || farm.crop,
            farmName: params.farmName || userFarm.farmName || farm.farmName,
            city: params.city || userFarm.location?.city || farm.city,
            state: params.state || userFarm.location?.state || farm.state,
            latitude: params.latitude ? parseFloat(params.latitude) : (userFarm.latitude || farm.latitude),
            longitude: params.longitude ? parseFloat(params.longitude) : (userFarm.longitude || farm.longitude),
            area: params.area ? parseFloat(params.area) : (userFarm.area || farm.area),
            cropStage: params.cropStage || userFarm.cropStage || farm.cropStage,
          };
          logger.info(`[Daily Briefing] Loaded farm profile for user ${req.userId}: ${farm.farmName} (${farm.crop}) in ${farm.city}`);
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
