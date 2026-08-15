const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
