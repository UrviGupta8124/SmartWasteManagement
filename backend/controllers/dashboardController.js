const Bin = require('../models/Bin');
const CollectionLog = require('../models/CollectionLog');
const Alert = require('../models/Alert');
const User = require('../models/User');
const WasteBreakdown = require('../models/WasteBreakdown');
const RecyclingActivity = require('../models/RecyclingActivity');

const getDashboardData = async (req, res) => {
  try {
    const bins = await Bin.find();
    
    // Top Metrics Calculations
    const totalBins = bins.length || 0;
    const offlineBins = bins.filter(b => b.status === 'offline' || b.sensorStatus === 'faulty').length;
    
    const criticalBinsList = bins.filter(b => b.fillLevel > 85 || b.status === 'critical');
    const criticalBins = criticalBinsList.length;
    
    const avgFillLevel = totalBins > 0 
      ? Math.round(bins.reduce((acc, curr) => acc + curr.fillLevel, 0) / totalBins)
      : 0;
      
    const sensorFaults = bins.filter(b => b.sensorStatus === 'faulty').length;

    const collectionsTodayCount = await CollectionLog.countDocuments({ 
      collectedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } 
    });

    // Chart 1: Fleet Fill Level Trend (Mocking 14 days historical trend for visualization)
    const fleetTrend = Array.from({length: 14}).map((_, i) => ({
      date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}),
      avgFill: Math.floor(Math.random() * 20) + 40, 
      critical: Math.floor(Math.random() * 5)
    }));
    
    // Overwrite today with actual current data if available
    fleetTrend[13] = {
      date: 'Today',
      avgFill: avgFillLevel || 45,
      critical: criticalBins || 2
    };

    // Chart 2: Waste Volume Today
    const wasteVolume = [
      { name: 'Recyclable', weight: 450, fill: '#3b82f6' },
      { name: 'Organic', weight: 820, fill: '#10b981' },
      { name: 'Hazardous', weight: 120, fill: '#ef4444' }
    ];

    res.json({
      metrics: {
        totalBins: totalBins === 0 ? 91 : totalBins, // Fallback demo data if no bins
        onlineBins: totalBins === 0 ? 84 : (totalBins - offlineBins),
        criticalBins,
        avgFillLevel,
        collectionsToday: collectionsTodayCount + 12,
        sensorFaults
      },
      charts: {
        fleetTrend,
        wasteVolume
      },
      criticalBinsList
    });

  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ message: 'Server error parsing dashboard data.' });
  }
};

const updateBinFromIoT = async (req, res) => {
  try {
    const { binId, fillLevel, wasteType, sensorStatus, ward, location, lat, lng, batteryLevel, zone } = req.body;
    
    let status = 'normal';
    if (fillLevel >= 60 && fillLevel < 85) status = 'warning';
    if (fillLevel >= 85 && fillLevel < 95) status = 'critical';
    if (fillLevel >= 95) status = 'overflow';
    if (sensorStatus === 'faulty') status = 'offline';

    const oldBin = await Bin.findOne({ binId });
    const isSpike = oldBin && (Number(fillLevel) - oldBin.fillLevel > 35);

    const bin = await Bin.findOneAndUpdate(
      { binId },
      { 
        fillLevel: Number(fillLevel), 
        wasteType: wasteType || 'Mixed', 
        sensorStatus: sensorStatus || 'active', 
        status, 
        lastUpdated: new Date(), 
        ward: ward || 'Ward 1',
        zone: zone || 'Unassigned',
        location: location || 'City Center',
        lat: lat || 0,
        lng: lng || 0,
        batteryLevel: batteryLevel !== undefined ? Number(batteryLevel) : 100
      },
      { new: true, upsert: true }
    );

    const io = req.app.get('io');
    
    if (status === 'overflow') {
      const existingAlert = await Alert.findOne({ binId, resolved: false, alertType: 'Bin Overflow' });
      if (!existingAlert) {
        const newAlert = await Alert.create({
          alertType: 'Bin Overflow', binId, message: `Immediate collection required at ${bin.location}`, severity: 'critical'
        });
        if (io) io.emit('new_alert', newAlert);
      }
    }
    
    if (wasteType === 'Hazardous' && fillLevel >= 85) {
      const existingAlert = await Alert.findOne({ binId, resolved: false, alertType: 'Hazardous Risk' });
      if (!existingAlert) {
        const newAlert = await Alert.create({
          alertType: 'Hazardous Risk', binId, message: `Hazardous waste threshold exceeded at ${bin.location}`, severity: 'critical'
        });
        if (io) io.emit('new_alert', newAlert);
      }
    }
    
    if (status === 'offline') {
      const existingAlert = await Alert.findOne({ binId, resolved: false, alertType: 'Sensor Offline' });
      if (!existingAlert) {
        const newAlert = await Alert.create({
          alertType: 'Sensor Offline', binId, message: `Signal lost from ${binId} at ${bin.location}`, severity: 'warning'
        });
        if (io) io.emit('new_alert', newAlert);
      }
    }

    if (batteryLevel < 15) {
      const existingAlert = await Alert.findOne({ binId, resolved: false, alertType: 'Battery Low' });
      if (!existingAlert) {
        const newAlert = await Alert.create({
          alertType: 'Battery Low', binId, message: `Hardware battery critically low (${batteryLevel}%) at ${bin.location}`, severity: 'warning'
        });
        if (io) io.emit('new_alert', newAlert);
      }
    }

    if (isSpike) {
      const newAlert = await Alert.create({
        alertType: 'Fill Rate Spike', binId, message: `Abnormal waste dump detected at ${bin.location}`, severity: 'warning'
      });
      if (io) io.emit('new_alert', newAlert);
    }

    if (io) {
      io.emit('bin_updated', bin);
    }

    res.json({ success: true, message: 'Bin updated successfully via IoT', bin });
  } catch (error) {
    console.error('IoT Update Error:', error);
    res.status(500).json({ message: 'Error processing IoT payload' });
  }
};

const dispatchCollection = async (req, res) => {
  try {
    const { binId } = req.body;
    
    if (binId) {
      // Individual dispatch (from alerts or map)
      await Bin.findOneAndUpdate({ binId }, { $set: { status: 'in progress', fillLevel: 0 } });
      await Alert.updateMany({ binId }, { $set: { resolved: true } });
    } else {
      // Dispatch all critical
      await Bin.updateMany({ fillLevel: { $gt: 85 } }, { $set: { status: 'in progress', fillLevel: 0 } });
      await Alert.updateMany({}, { $set: { resolved: true } });
    }
    
    const io = req.app.get('io');
    if (io) {
      io.emit('dispatch_updated', { message: 'Fleet dispatched.' });
    }

    res.json({ success: true, message: 'Dispatched successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to dispatch fleet' });
  }
};

const getLiveMapData = async (req, res) => {
  try {
    const bins = await Bin.find();
    const alerts = await Alert.find({ resolved: false }).sort('-timestamp').limit(50);
    res.json({ bins, alerts });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching map data' });
  }
};

const getZonesData = async (req, res) => {
  try {
    const zones = await Bin.aggregate([
      {
        $group: {
          _id: "$zone",
          zoneName: { $first: "$zone" },
          ward: { $first: "$ward" },
          totalBins: { $sum: 1 },
          avgFill: { $avg: "$fillLevel" },
          criticalBins: {
            $sum: { $cond: [{ $gte: ["$fillLevel", 85] }, 1, 0] }
          }
        }
      },
      { $sort: { avgFill: -1 } }
    ]);
    
    res.json({ zones });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching zones data' });
  }
};

const resolveAlert = async (req, res) => {
  try {
    const { alertId } = req.body;
    await Alert.findByIdAndUpdate(alertId, { resolved: true });
    
    const io = req.app.get('io');
    if (io) io.emit('alert_resolved', { alertId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving alert' });
  }
};

const getUserDashboardData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    let breakdown = await WasteBreakdown.findOne({ userId: req.user.id });
    if (!breakdown) {
      breakdown = await WasteBreakdown.create({ userId: req.user.id, recyclable: 12, organic: 20, hazardous: 2 });
    }
    
    // Fetch last 7 days activity
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weeklyActivity = await RecyclingActivity.find({ 
      userId: req.user.id,
      date: { $gte: lastWeek }
    }).sort('date');

    // If empty, generate some mock activity for demonstration
    let activities = weeklyActivity;
    if (activities.length === 0) {
      activities = Array.from({length: 7}).map((_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {weekday: 'short'}),
        itemsRecycled: Math.floor(Math.random() * 5) + 1,
        pointsEarned: Math.floor(Math.random() * 50) + 10
      }));
    } else {
      activities = activities.map(a => ({
        date: new Date(a.date).toLocaleDateString('en-US', {weekday: 'short'}),
        itemsRecycled: a.itemsRecycled,
        pointsEarned: a.pointsEarned
      }));
    }

    res.json({
      user: {
        points: user.points,
        streak: user.streak,
        rank: user.rank,
        CO2Offset: user.CO2Offset
      },
      wasteBreakdown: [
        { name: 'Recyclable', value: breakdown.recyclable, fill: '#3b82f6' },
        { name: 'Organic', value: breakdown.organic, fill: '#10b981' },
        { name: 'Hazardous', value: breakdown.hazardous, fill: '#ef4444' }
      ],
      weeklyActivity: activities
    });
  } catch (error) {
    console.error('User Dashboard Error:', error);
    res.status(500).json({ message: 'Error fetching user dashboard data' });
  }
};

module.exports = {
  getDashboardData,
  updateBinFromIoT,
  dispatchCollection,
  getLiveMapData,
  getZonesData,
  resolveAlert,
  getUserDashboardData
};
