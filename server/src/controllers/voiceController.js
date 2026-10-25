const { transcribeAudio, synthesizeSpeech, agriculturalChat, isGnaniConfigured } = require('../services/gnaniService');
const AssistantConversation = require('../models/AssistantConversation');
const { isDBConnected } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * POST /api/voice/transcribe
 *
 * Accepts audio file upload (multipart/form-data) and returns transcription.
 * Uses Gnani Prisma v2.5 STT.
 */
async function transcribe(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file uploaded. Send audio as multipart/form-data with field name "audio".',
      });
    }

    const languageCode = req.body.language || 'hi-IN';

    if (!isGnaniConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Gnani AI voice transcription service is not configured. Please set GNANI_API_KEY.',
        fallback: 'webSpeechAPI',
      });
    }

    const result = await transcribeAudio(
      req.file.buffer,
      req.file.originalname || 'audio.webm',
      languageCode
    );

    res.json({
      success: true,
      data: {
        transcript: result.transcript,
        language: result.language,
        requestId: result.requestId,
        provider: 'Gnani AI (Prisma v2.5)',
      },
    });
  } catch (error) {
    logger.error('Voice transcription error:', error.message);
    next(error);
  }
}

/**
 * POST /api/voice/synthesize
 *
 * Accepts text and returns synthesized audio.
 * Uses Gnani Timbre v2.5 TTS.
 */
async function synthesize(req, res, next) {
  try {
    const { text, language = 'hi-IN', voice = null, speed = 1.0 } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for speech synthesis.',
      });
    }

    if (!isGnaniConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Gnani AI speech synthesis is not configured. Falling back to browser speech synthesis.',
        fallback: 'webSpeechSynthesis',
      });
    }

    const result = await synthesizeSpeech(text.trim(), language, voice, parseFloat(speed) || 1.0);

    // Return as binary audio stream
    res.setHeader('Content-Type', result.contentType || 'audio/wav');
    res.setHeader('Content-Length', result.audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(result.audioBuffer);
  } catch (error) {
    logger.error('Speech synthesis error:', error.message);
    next(error);
  }
}

/**
 * POST /api/voice/chat
 *
 * End-to-end voice-first conversation:
 * 1. Audio in -> Gnani Prisma v2.5 STT -> Text
 * 2. Text + Context -> Gnani Evon v3.3 LLM -> Agricultural Advice
 * 3. Advice -> Gnani Timbre v2.5 TTS -> Audio Out
 *
 * Accepts multipart/form-data with optional 'audio' file OR json with 'message'.
 */
async function voiceChat(req, res, next) {
  try {
    const languageCode = req.body.language || 'hi-IN';
    const sessionId = req.body.sessionId || uuidv4();
    let userMessage = req.body.message || '';
    let userTranscript = null;

    // Parse agricultural context from form field if stringified
    let context = {};
    if (req.body.context) {
      try {
        context = typeof req.body.context === 'string'
          ? JSON.parse(req.body.context)
          : req.body.context;
      } catch {
        context = {};
      }
    }

    // Step 1: Transcribe audio if provided
    if (req.file) {
      if (!isGnaniConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Voice processing requires GNANI_API_KEY. Please configure it or use text input.',
          fallback: 'webSpeechAPI',
        });
      }

      logger.info(`Transcribing voice input: ${req.file.size} bytes, lang=${languageCode}`);
      const sttResult = await transcribeAudio(
        req.file.buffer,
        req.file.originalname || 'audio.webm',
        languageCode
      );
      userMessage = sttResult.transcript;
      userTranscript = sttResult.transcript;
    }

    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({
        success: false,
        error: 'No message provided. Send audio or text.',
      });
    }

    // Step 2: Get conversation history
    let history = [];
    if (isDBConnected()) {
      try {
        const conversation = await AssistantConversation.findOne({ sessionId }).maxTimeMS(5000);
        history = conversation?.messages?.map((m) => ({ role: m.role, content: m.content })) || [];
      } catch { /* ignore */ }
    }

    // Step 3: Get AI response via Gnani AI (Evon v3.3)
    let aiResponse;
    try {
      aiResponse = await agriculturalChat(userMessage.trim(), context, history);
    } catch (llmError) {
      logger.warn('Gnani AI agricultural chat failed:', llmError.message);
      aiResponse = languageCode.startsWith('hi')
        ? 'माफ़ कीजिए, अभी AI सेवा से संपर्क नहीं हो पाया। कृपया कुछ देर बाद फिर से कोशिश करें या अपने नजदीकी कृषि विज्ञान केंद्र (KVK) से संपर्क करें।'
        : 'Sorry, the AI service is temporarily unavailable. Please try again shortly or consult your local Krishi Vigyan Kendra (KVK).';
    }

    // Step 4: Save conversation history
    if (isDBConnected()) {
      try {
        let conversation = await AssistantConversation.findOne({ sessionId }).maxTimeMS(5000);
        if (!conversation) {
          conversation = new AssistantConversation({
            userId: req.userId || null,
            sessionId,
            messages: [],
          });
        }
        conversation.messages.push(
          { role: 'user', content: userMessage.trim() },
          { role: 'assistant', content: aiResponse }
        );
        if (conversation.messages.length > 50) {
          conversation.messages = conversation.messages.slice(-50);
        }
        await conversation.save();
      } catch { /* ignore DB save failure */ }
    }

    // Step 5: Build response
    const responseData = {
      sessionId,
      userTranscript: userMessage.trim(),
      response: aiResponse,
      provider: 'Gnani AI (Evon v3.3)',
      timestamp: new Date().toISOString(),
      hasAudio: false,
    };

    // Step 6: Optionally synthesize audio response
    if (isGnaniConfigured() && req.body.wantAudio !== 'false') {
      try {
        const ttsResult = await synthesizeSpeech(aiResponse, languageCode);
        responseData.hasAudio = true;
        responseData.audioBase64 = ttsResult.audioBuffer.toString('base64');
        responseData.audioContentType = ttsResult.contentType;
      } catch (ttsError) {
        logger.warn('Gnani TTS synthesis failed (non-blocking):', ttsError.message);
        // Non-blocking: text response still goes through
      }
    }

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    logger.error('Voice chat error:', error.message);
    next(error);
  }
}

/**
 * GET /api/voice/status
 *
 * Returns the current voice service configuration status.
 */
async function status(req, res) {
  res.json({
    success: true,
    data: {
      gnaniConfigured: isGnaniConfigured(),
      provider: 'Gnani AI',
      stt: isGnaniConfigured() ? 'prisma-v2.5 (Gnani AI)' : 'webSpeechAPI',
      tts: isGnaniConfigured() ? 'timbre-v2.5 (Gnani AI)' : 'webSpeechSynthesis',
      llm: isGnaniConfigured() ? 'evon-v3.3 (Gnani AI)' : 'offline-indic-agronomy',
      supportedLanguages: [
        { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'en-IN', name: 'English (India)', nativeName: 'English' },
        { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
        { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
        { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
        { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
        { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
        { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
      ],
    },
  });
}

module.exports = { transcribe, synthesize, voiceChat, status };
