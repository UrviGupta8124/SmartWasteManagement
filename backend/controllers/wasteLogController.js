const WasteLog = require('../models/WasteLog');
const User = require('../models/User');

// ============================================================
// POST /api/dashboard/waste-log
// Called by Python script after each classification
// Body: { binId, category, confidence }
// ============================================================
exports.logWaste = async (req, res) => {
    try {
        const { binId, category, confidence } = req.body;

        if (!binId || !category || confidence === undefined) {
            return res.status(400).json({ message: 'binId, category, and confidence are required.' });
        }

        const validCategories = ['Organic', 'Recyclable', 'Hazardous'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ message: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
        }

        // Find user by binId
        const user = await User.findOne({ binId });
        if (!user) {
            return res.status(404).json({ message: 'No resident found for this dustbin ID.' });
        }

        // Add 1 point for triggering the IR sensor scanning cycle
        user.points = (user.points || 0) + 1;
        await user.save();

        const log = await WasteLog.create({ userId: user._id.toString(), category, confidence });

        // Emit real-time update via Socket.io so dashboard refreshes live
        const io = req.app.get('io');
        if (io) {
            io.emit('new_waste_log', {
                id: log._id,
                userId: log.userId,
                category: log.category,
                confidence: log.confidence,
                timestamp: log.createdAt
            });
        }

        console.log(`[WasteLog] Saved: ${category} (${confidence.toFixed(1)}%) for user ${user._id} (Bin: ${binId})`);
        res.status(201).json({ success: true, log });

    } catch (error) {
        console.error('[WasteLog] Error saving log:', error);
        res.status(500).json({ message: 'Server error saving waste log.' });
    }
};

// ============================================================
// GET /api/dashboard/waste-stats
// Returns stats for the municipal dashboard
// Query params: ?period=today|week|month (default: today)
// ============================================================
exports.getWasteStats = async (req, res) => {
    try {
        const { period = 'today' } = req.query;

        // Calculate the start date based on period
        const now = new Date();
        let startDate;
        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // midnight today
        } else if (period === 'week') {
            startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === 'month') {
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }

        // Total IR triggers in period = total number of logs
        const totalIRTriggers = await WasteLog.countDocuments({
            createdAt: { $gte: startDate }
        });

        // Count by category
        const categoryCounts = await WasteLog.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    avgConfidence: { $avg: '$confidence' }
                }
            }
        ]);

        // Format into a clean object { Organic: 10, Recyclable: 5, Hazardous: 2 }
        const breakdown = { Organic: 0, Recyclable: 0, Hazardous: 0 };
        const avgConfidence = { Organic: 0, Recyclable: 0, Hazardous: 0 };
        categoryCounts.forEach(item => {
            breakdown[item._id] = item.count;
            avgConfidence[item._id] = Math.round(item.avgConfidence * 10) / 10;
        });

        // Daily trend for chart (last 7 days regardless of period, for the chart)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const dailyTrend = await WasteLog.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        category: '$category'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        // Reshape dailyTrend into array of { date, Organic, Recyclable, Hazardous }
        const trendMap = {};
        dailyTrend.forEach(item => {
            const d = item._id.date;
            if (!trendMap[d]) trendMap[d] = { date: d, Organic: 0, Recyclable: 0, Hazardous: 0 };
            trendMap[d][item._id.category] = item.count;
        });
        const trendArray = Object.values(trendMap);

        res.json({
            period,
            totalIRTriggers,
            breakdown,
            avgConfidence,
            dailyTrend: trendArray
        });

    } catch (error) {
        console.error('[WasteLog] Error fetching stats:', error);
        res.status(500).json({ message: 'Server error fetching waste stats.' });
    }
};

// ============================================================
// GET /api/dashboard/waste-stats/user
// Returns waste breakdown for the logged-in user (user dashboard)
// Requires authMiddleware → req.user.id
// ============================================================
exports.getUserWasteStats = async (req, res) => {
    try {
        const userId = req.user.id; // MongoDB ObjectId from JWT

        // Last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const categoryCounts = await WasteLog.aggregate([
            { $match: { userId: userId.toString(), createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);

        const breakdown = { Organic: 0, Recyclable: 0, Hazardous: 0 };
        categoryCounts.forEach(item => { breakdown[item._id] = item.count; });

        const totalScans = breakdown.Organic + breakdown.Recyclable + breakdown.Hazardous;

        res.json({
            totalScans,
            breakdown,
            // Formatted for recharts pie/bar chart
            chartData: [
                { name: 'Recyclable', value: breakdown.Recyclable, fill: '#3b82f6' },
                { name: 'Organic', value: breakdown.Organic, fill: '#10b981' },
                { name: 'Hazardous', value: breakdown.Hazardous, fill: '#ef4444' }
            ]
        });

    } catch (error) {
        console.error('[WasteLog] Error fetching user stats:', error);
        res.status(500).json({ message: 'Server error fetching user waste stats.' });
    }
};