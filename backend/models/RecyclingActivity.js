const mongoose = require('mongoose');

const recyclingActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  itemsRecycled: { type: Number, required: true },
  pointsEarned: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('RecyclingActivity', recyclingActivitySchema);
