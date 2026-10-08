const mongoose = require('mongoose');

const cropAnalysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm' },
  imageUrl: { type: String, required: true },
  crop: { type: String, required: true, trim: true },
  possibleIssue: { type: String, default: 'Unknown' },
  confidence: { type: Number, min: 0, max: 100, default: 0 },
  severity: {
    type: String,
    enum: ['low', 'moderate', 'high', 'unknown', 'healthy'],
    default: 'unknown',
  },
  observations: [{ type: String }],
  recommendedActions: [{ type: String }],
  expertAttention: { type: String, default: '' },
  imageQuality: { type: String, default: 'unknown' },
  additionalNotes: { type: String, default: '' },
  disclaimer: {
    type: String,
    default: 'AI-assisted preliminary assessment. For serious crop damage or uncertain cases, consult a qualified agricultural expert.',
  },
}, {
  timestamps: true,
});

cropAnalysisSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CropAnalysis', cropAnalysisSchema);
