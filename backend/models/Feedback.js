const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  issueType: { type: String, required: true },
  comment: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
