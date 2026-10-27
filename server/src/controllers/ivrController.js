/**
 * KisanLens AI — Telephonic IVR Helpline Controller
 *
 * Exposes endpoints for:
 * - Starting interactive IVR calls (1800-889-KISAN)
 * - Handling DTMF keypad presses and noisy telephonic voice inputs
 * - Telephony webhooks (Twilio / Exotel)
 */

const { HELPLINE_NUMBER, HELPLINE_DIGITS, IVR_PROMPTS, processIVRInput, generateTwiMLResponse } = require('../services/ivrService');
const logger = require('../utils/logger');

/**
 * GET /api/ivr/info
 */
async function getHelplineInfo(req, res) {
  res.json({
    success: true,
    data: {
      helplineNumber: HELPLINE_NUMBER,
      helplineDigits: HELPLINE_DIGITS,
      title: 'KisanLens AI Telephonic IVR Helpline',
      description: 'Dial 1800-889-KISAN for 24x7 automated agricultural assistance on basic feature phones without internet or smartphones.',
      awardCategory: 'Noise Canceller Award (Robust 8kHz noisy telephonic audio handling via Gnani Prisma STT)',
      menu: IVR_PROMPTS.welcome.menu,
    },
  });
}

/**
 * POST /api/ivr/start
 * Initiate an IVR call session with greeting
 */
async function startCall(req, res, next) {
  try {
    const language = req.body.language || 'hi-IN';
    const location = req.body.location || {};

    const result = await processIVRInput({
      digits: null,
      audioBuffer: null,
      language,
      location,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('IVR startCall error:', error);
    next(error);
  }
}

/**
 * POST /api/ivr/action
 * Process DTMF key press or noisy telephonic voice input
 */
async function handleAction(req, res, next) {
  try {
    const digits = req.body.digits || req.query.digits;
    const language = req.body.language || 'hi-IN';
    let location = {};
    if (req.body.location) {
      try {
        location = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location;
      } catch {
        location = {};
      }
    }

    // Audio file from multipart upload (e.g. noisy phone recording from feature phone simulator)
    const audioBuffer = req.file?.buffer;
    const audioFilename = req.file?.originalname || 'telephonic_recording.wav';

    const result = await processIVRInput({
      digits,
      audioBuffer,
      audioFilename,
      language,
      location,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('IVR handleAction error:', error);
    next(error);
  }
}

/**
 * POST /api/ivr/webhook
 * Carrier webhook (Twilio / Exotel compatible TwiML XML response)
 */
async function handleWebhook(req, res) {
  try {
    const digits = req.body.Digits || req.body.digits || req.query.digits;
    const result = await processIVRInput({ digits, language: 'hi-IN' });
    const twiml = generateTwiMLResponse({ text: result.responseText });

    res.setHeader('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error('IVR webhook error:', error);
    res.setHeader('Content-Type', 'text/xml');
    res.send('<Response><Say language="hi-IN">माफ़ कीजिए, तकनीकी समस्या के कारण हेल्पलाइन उपलब्ध नहीं है।</Say></Response>');
  }
}

module.exports = {
  getHelplineInfo,
  startCall,
  handleAction,
  handleWebhook,
};
