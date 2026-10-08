const mongoose = require('mongoose');

const marketSnapshotSchema = new mongoose.Schema({
  commodity: { type: String, required: true, trim: true, index: true },
  market: { type: String, trim: true },
  state: { type: String, trim: true, index: true },
  district: { type: String, trim: true },
  minPrice: { type: Number },
  maxPrice: { type: Number },
  modalPrice: { type: Number },
  date: { type: Date, required: true },
  source: { type: String, enum: ['api', 'demo', 'fallback'], default: 'demo' },
}, {
  timestamps: true,
});

marketSnapshotSchema.index({ commodity: 1, state: 1, date: -1 });

module.exports = mongoose.model('MarketSnapshot', marketSnapshotSchema);
