/**
 * KisanLens AI — AI Service Migration Notice
 *
 * This project has completely migrated from Google Gemini to 100% Gnani AI:
 * - STT: Gnani Prisma v2.5
 * - TTS: Gnani Timbre v2.5
 * - LLM: Gnani Evon v3.3
 *
 * Any calls to this file are seamlessly routed to Gnani AI (gnaniService.js).
 */

const { agriculturalChat, analyzeCrop } = require('./gnaniService');
const logger = require('../utils/logger');

/**
 * Chat with agricultural assistant (routed to Gnani Evon v3.3)
 */
async function chatWithAssistant(message, context = {}) {
  logger.info('[KisanLens AI] chatWithAssistant routed to Gnani Evon v3.3');
  const history = context.history || [];
  return agriculturalChat(message, context, history);
}

/**
 * Analyze crop image / health (routed to Gnani Evon v3.3)
 */
async function analyzeCropImage(imagePath, crop) {
  logger.info('[KisanLens AI] analyzeCropImage routed to Gnani Evon v3.3');
  return analyzeCrop(imagePath, crop);
}

module.exports = {
  chatWithAssistant,
  analyzeCropImage,
};
