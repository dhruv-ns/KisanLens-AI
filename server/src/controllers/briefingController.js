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
      crop: '',
      farmName: '',
      city: '',
      state: '',
      latitude: null,
      longitude: null,
      area: 0,
      cropStage: '',
    };

    // 1. If user is authenticated and DB is connected, load their saved primary farm profile
    if (req.userId && isDBConnected()) {
      try {
        const userFarm = await Farm.findOne({ userId: req.userId }).sort({ updatedAt: -1 });
        if (userFarm) {
          farm = {
            crop: userFarm.crop || '',
            farmName: userFarm.farmName || '',
            city: userFarm.location?.city || '',
            state: userFarm.location?.state || '',
            latitude: userFarm.latitude || null,
            longitude: userFarm.longitude || null,
            area: userFarm.area || 0,
            cropStage: userFarm.cropStage || '',
          };
          logger.info(`[Daily Briefing] Loaded saved farm for user ${req.userId}: ${farm.farmName} (${farm.crop}) in ${farm.city}, ${farm.state}`);
        }
      } catch (dbErr) {
        logger.warn('[Daily Briefing] DB farm lookup failed:', dbErr.message);
      }
    }

    // 2. Apply non-empty client-provided parameters (from My Farm frontend state or URL)
    if (params.crop && typeof params.crop === 'string' && params.crop.trim()) farm.crop = params.crop.trim();
    if (params.farmName && typeof params.farmName === 'string' && params.farmName.trim()) farm.farmName = params.farmName.trim();
    if (params.city && typeof params.city === 'string' && params.city.trim()) farm.city = params.city.trim();
    if (params.state && typeof params.state === 'string' && params.state.trim()) farm.state = params.state.trim();
    if (params.latitude && !isNaN(parseFloat(params.latitude))) farm.latitude = parseFloat(params.latitude);
    if (params.longitude && !isNaN(parseFloat(params.longitude))) farm.longitude = parseFloat(params.longitude);
    if (params.cropStage && typeof params.cropStage === 'string' && params.cropStage.trim()) farm.cropStage = params.cropStage.trim();
    if (params.area && !isNaN(parseFloat(params.area))) farm.area = parseFloat(params.area);

    // 3. Sensible defaults only if field remains empty after DB and client params
    if (!farm.crop) farm.crop = 'Wheat';
    if (!farm.farmName) farm.farmName = 'My Farm';
    if (!farm.city) farm.city = 'Indore';
    if (!farm.state) farm.state = 'Madhya Pradesh';
    if (!farm.cropStage) farm.cropStage = 'Vegetative Growth';

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
