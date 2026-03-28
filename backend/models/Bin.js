const mongoose = require('mongoose');

const binSchema = new mongoose.Schema({
  binId: { type: String, required: true, unique: true },
  ward: { type: String, required: true },
  location: { type: String, required: true },
  zone: { type: String, required: true, default: 'Unassigned' },
  lat: { type: Number },
  lng: { type: Number },
  fillLevel: { type: Number, default: 0, min: 0, max: 100 },
  batteryLevel: { type: Number, default: 100, min: 0, max: 100 },
  wasteType: { type: String, enum: ['Organic', 'Recyclable', 'Hazardous', 'Mixed'], default: 'Mixed' },
  status: { type: String, enum: ['normal', 'warning', 'critical', 'overflow', 'in progress', 'offline'], default: 'normal' },
  sensorStatus: { type: String, enum: ['active', 'faulty'], default: 'active' },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bin', binSchema);
