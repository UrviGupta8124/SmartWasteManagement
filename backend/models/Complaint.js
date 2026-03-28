const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  issueType: { type: String, required: true },
  description: { type: String, required: true },
  imageURL: { type: String },
  status: { type: String, enum: ['Pending', 'Resolved'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
