const mongoose = require('mongoose');

const wasteLogSchema = new mongoose.Schema({
    userId: {
        type: String,  // Firebase UID string (from Python), OR can be ObjectId if from app users
        required: true
    },
    category: {
        type: String,
        enum: ['Organic', 'Recyclable', 'Hazardous'],
        required: true
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    irTriggerCount: {
        type: Number,
        default: 1   // Each log = 1 IR trigger. Aggregate to get total.
    }
}, { timestamps: true }); // createdAt & updatedAt auto-added

module.exports = mongoose.model('WasteLog', wasteLogSchema);