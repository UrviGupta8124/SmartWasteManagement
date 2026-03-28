const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  alertType: { type: String, required: true },
  binId: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  resolved: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);
