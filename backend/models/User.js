const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'municipality'],
    default: 'user'
  },
  binId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  deviceState: {
    led: {
      type: String,
      enum: ['ON', 'OFF'],
      default: 'OFF'
    },
    fanSpeed: {
      type: Number,
      default: 0
    }
  },
  points: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  rank: { type: String, default: 'Green Starter' },
  CO2Offset: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
