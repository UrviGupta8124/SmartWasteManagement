const mongoose = require('mongoose');

const collectionLogSchema = new mongoose.Schema({
  binId: { type: String, required: true },
  collectedAt: { type: Date, default: Date.now },
  wasteWeight: { type: Number, required: true }, // in kg
  wasteType: { type: String, required: true },
  collectedBy: { type: String, required: true }
});

module.exports = mongoose.model('CollectionLog', collectionLogSchema);
