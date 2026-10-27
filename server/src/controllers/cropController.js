const { analyzeCrop: gnaniAnalyzeCrop, transcribeAudio, synthesizeSpeech, isGnaniConfigured } = require('../services/gnaniService');
const CropAnalysis = require('../models/CropAnalysis');
const { isDBConnected } = require('../config/database');
const { uploadToImageKit } = require('../utils/imagekit');
const logger = require('../utils/logger');
const fs = require('fs');

/**
 * POST /api/crops/analyze
 * Diagnoses crop health using Multimodal Voice + Image AI (Gnani Prisma STT + Evon + Timbre TTS)
 */
async function analyzeCrop(req, res, next) {
  const imageFile = req.files?.image?.[0] || req.file;
  const audioFile = req.files?.audio?.[0];

  try {
    if (!imageFile) {
      return res.status(400).json({ success: false, error: 'No crop image uploaded. Please provide an image.' });
    }

    const crop = req.body.crop || 'Unknown';
    let symptoms = req.body.symptoms || req.body.notes || '';
    const language = req.body.language || 'hi';
    const imagePath = imageFile.path;

    // Multimodal Voice Processing: transcribe farmer's spoken query via Gnani Prisma STT
    let userVoiceQuery = null;
    if (audioFile && isGnaniConfigured()) {
      try {
        const audioBuffer = fs.readFileSync(audioFile.path);
        logger.info(`[Multimodal Crop Diagnostics] Transcribing voice question: ${audioBuffer.length} bytes, lang=${language}`);
        const sttResult = await transcribeAudio(
          audioBuffer,
          audioFile.originalname || 'voice_question.wav',
          language
        );
        if (sttResult?.transcript && sttResult.transcript.trim()) {
          userVoiceQuery = sttResult.transcript.trim();
          symptoms = symptoms
            ? `${symptoms} | Farmer Voice Question: "${userVoiceQuery}"`
            : `Farmer Voice Question: "${userVoiceQuery}"`;
          logger.info(`[Multimodal Crop Diagnostics] Transcribed farmer question: "${userVoiceQuery}"`);
        }
      } catch (voiceErr) {
        logger.warn('Failed to transcribe crop voice note, continuing with image analysis:', voiceErr.message);
      } finally {
        try { fs.unlinkSync(audioFile.path); } catch (e) { /* ignore */ }
      }
    }

    logger.info(`Analyzing crop image via Gnani AI: ${crop}, lang: ${language}, file: ${imageFile.filename}`);

    // Call Gnani AI Crop Diagnostic Engine with regional language and multimodal symptoms
    const analysis = await gnaniAnalyzeCrop(imagePath, crop, symptoms, {
      location: req.body.location,
      language,
      userVoiceQuery,
    });

    // Upload image to ImageKit
    let imageUrl = `/uploads/${imageFile.filename}`; // fallback
    try {
      const { url } = await uploadToImageKit(imagePath, imageFile.filename, '/kisanlens/crops');
      imageUrl = url;
      logger.info(`Image uploaded to ImageKit: ${url}`);
      // Clean up local temp file only when remote upload succeeded
      try { fs.unlinkSync(imagePath); } catch (e) { /* ignore */ }
    } catch (ikErr) {
      logger.warn('ImageKit upload failed, keeping local file for fallback:', ikErr.message);
    }

    // Auto-synthesize voice response using Gnani Timbre TTS
    let audioBase64 = null;
    let audioContentType = 'audio/wav';
    const effectiveLang = analysis.language || language;
    if (isGnaniConfigured() && req.body.wantAudio !== 'false') {
      try {
        const obsFirst = Array.isArray(analysis.observations) ? analysis.observations[0] : '';
        const actFirst = Array.isArray(analysis.recommendedActions) ? analysis.recommendedActions[0] : '';
        const spokenScript = `${analysis.crop}। समस्या: ${analysis.possibleIssue}। मुख्य लक्षण: ${obsFirst}। अनुशंसित उपचार: ${actFirst}। ${analysis.expertAttention || ''}`;
        const synthRes = await synthesizeSpeech(spokenScript.slice(0, 1000), effectiveLang);
        if (synthRes?.audioBuffer) {
          audioBase64 = synthRes.audioBuffer.toString('base64');
          audioContentType = synthRes.contentType || 'audio/wav';
        }
      } catch (synthErr) {
        logger.warn('Pre-synthesis of crop diagnosis audio warning:', synthErr.message);
      }
    }

    // Save to database if connected
    let recordId = 'local_' + Date.now();
    if (isDBConnected()) {
      try {
        const record = new CropAnalysis({
          userId: req.userId || null,
          farmId: req.body.farmId || null,
          imageUrl,
          crop: analysis.crop,
          possibleIssue: analysis.possibleIssue,
          confidence: analysis.confidence,
          severity: analysis.severity,
          observations: analysis.observations,
          recommendedActions: analysis.recommendedActions,
          expertAttention: analysis.expertAttention,
          imageQuality: analysis.imageQuality,
          additionalNotes: userVoiceQuery
            ? `${analysis.additionalNotes || ''} [Farmer Query: ${userVoiceQuery}]`.trim()
            : analysis.additionalNotes,
        });
        await record.save();
        recordId = record._id;
      } catch (dbErr) {
        logger.warn('Failed to save analysis to DB:', dbErr.message);
      }
    }

    const isEn = language === 'en' || language === 'en-in' || language === 'en-IN';
    const disclaimer = isEn
      ? 'AI-assisted preliminary assessment powered by Gnani AI. For serious crop damage or uncertain cases, consult a qualified agricultural expert or your local Krishi Vigyan Kendra (KVK).'
      : 'Gnani AI द्वारा संचालित प्रारंभिक कृषि स्वास्थ्य मूल्यांकन। गंभीर फसल क्षति या अनिश्चित मामलों में अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या कृषि विशेषज्ञ से सलाह लें।';

    res.status(200).json({
      success: true,
      data: {
        id: recordId,
        ...analysis,
        imageUrl,
        userVoiceQuery,
        hasAudio: Boolean(audioBase64),
        audioBase64,
        audioContentType,
        language: analysis.language || language,
        disclaimer: analysis.disclaimer || disclaimer,
        provider: 'Gnani AI (Prisma STT + Timbre TTS + Evon)',
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Clean up uploaded files on error
    if (imageFile?.path) {
      try { fs.unlinkSync(imageFile.path); } catch (e) { /* ignore */ }
    }
    if (audioFile?.path) {
      try { fs.unlinkSync(audioFile.path); } catch (e) { /* ignore */ }
    }
    next(error);
  }
}

/**
 * GET /api/crops/history
 */
async function getCropHistory(req, res, next) {
  try {
    if (!isDBConnected()) {
      return res.json({ success: true, data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const query = req.userId ? { userId: req.userId } : {};
    const [analyses, total] = await Promise.all([
      CropAnalysis.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).maxTimeMS(5000).lean(),
      CropAnalysis.countDocuments(query).maxTimeMS(5000),
    ]);

    res.json({
      success: true,
      data: analyses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    // Return empty on DB errors
    res.json({ success: true, data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } });
  }
}

/**
 * GET /api/crops/:id
 */
async function getCropAnalysis(req, res, next) {
  try {
    if (!isDBConnected()) {
      return res.status(404).json({ success: false, error: 'Database unavailable.' });
    }
    const analysis = await CropAnalysis.findById(req.params.id).maxTimeMS(5000).lean();
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found.' });
    }
    res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
}

module.exports = { analyzeCrop, getCropHistory, getCropAnalysis };
