const mongoose = require('mongoose');

const wasteBreakdownSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recyclable: { type: Number, default: 0 },
  organic: { type: Number, default: 0 },
  hazardous: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('WasteBreakdown', wasteBreakdownSchema);
