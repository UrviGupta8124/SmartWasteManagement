const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reward: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward', required: true },
  pointsDeducted: { type: Number, required: true },
  redeemedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Redemption', redemptionSchema);
