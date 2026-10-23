const { analyzeCropImage } = require('../services/geminiService');
const CropAnalysis = require('../models/CropAnalysis');
const { isDBConnected } = require('../config/database');
const { uploadToImageKit } = require('../utils/imagekit');
const logger = require('../utils/logger');
const fs = require('fs');

/**
 * POST /api/crops/analyze
 */
async function analyzeCrop(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded.' });
    }

    const crop = req.body.crop || 'Unknown';
    const imagePath = req.file.path;

    logger.info(`Analyzing crop image: ${crop}, file: ${req.file.filename}`);

    // Call Gemini AI
    const analysis = await analyzeCropImage(imagePath, crop);

    // Upload image to ImageKit
    let imageUrl = `/uploads/${req.file.filename}`; // fallback
    try {
      const { url } = await uploadToImageKit(imagePath, req.file.filename, '/kisanlens/crops');
      imageUrl = url;
      logger.info(`Image uploaded to ImageKit: ${url}`);
      // Clean up local temp file only when remote upload succeeded
      try { fs.unlinkSync(imagePath); } catch (e) { /* ignore */ }
    } catch (ikErr) {
      logger.warn('ImageKit upload failed, keeping local file for fallback:', ikErr.message);
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
          additionalNotes: analysis.additionalNotes,
        });
        await record.save();
        recordId = record._id;
      } catch (dbErr) {
        logger.warn('Failed to save analysis to DB:', dbErr.message);
      }
    }

    const disclaimer = 'AI-assisted preliminary assessment. For serious crop damage or uncertain cases, consult a qualified agricultural expert.';

    res.status(200).json({
      success: true,
      data: {
        id: recordId,
        ...analysis,
        imageUrl,
        disclaimer,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
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
