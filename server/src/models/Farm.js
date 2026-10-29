const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
  farmName: { type: String, trim: true, default: 'My Farm' },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  location: {
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
  },
  latitude: Number,
  longitude: Number,
  area: { type: Number, min: 0 }, // in acres
  areaUnit: { type: String, enum: ['acres', 'hectares', 'bigha'], default: 'acres' },
  crop: { type: String, trim: true },
  cropStage: {
    type: String,
    enum: ['sowing', 'germination', 'vegetative', 'flowering', 'fruiting', 'harvesting', 'post-harvest', ''],
    default: '',
  },
  soilType: { type: String, trim: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Farm', farmSchema);
