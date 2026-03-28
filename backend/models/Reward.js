const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  pointsCost: { type: Number, required: true },
  status: { type: String, enum: ['active', 'out_of_stock'], default: 'active' },
  expiryText: { type: String }, // e.g. "Ends in 5 days"
  iconType: { type: String } // e.g. "Gift", "Ticket", "Leaf"
}, { timestamps: true });

module.exports = mongoose.model('Reward', rewardSchema);
