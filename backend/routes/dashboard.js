const express = require('express');
const router = express.Router();

const {
    getDashboardData,
    updateBinFromIoT,
    dispatchCollection,
    getLiveMapData,
    getZonesData,
    resolveAlert,
    getUserDashboardData
} = require('../controllers/dashboardController');

const {
    logWaste,
    getWasteStats,
    getUserWasteStats
} = require('../controllers/wasteLogController');  // <-- NEW

const authMiddleware = require('../middleware/authMiddleware');

// ---- Existing routes (unchanged) ----
router.get('/municipal', getDashboardData);
router.get('/user', authMiddleware, getUserDashboardData);
router.post('/iot-update', updateBinFromIoT);
router.post('/dispatch', dispatchCollection);
router.get('/bins/all', getLiveMapData);
router.get('/alerts', getLiveMapData);
router.get('/zones', getZonesData);
router.post('/alerts/resolve', resolveAlert);

// ---- NEW: FutureCan waste log routes ----

// Python script POSTs here after every classification
// No auth required (internal IoT call, similar to /iot-update)
router.post('/waste-log', logWaste);

// Municipal dashboard: GET stats with optional ?period=today|week|month
router.get('/waste-stats', getWasteStats);

// User dashboard: GET this user's waste breakdown (JWT protected)
router.get('/waste-stats/user', authMiddleware, getUserWasteStats);

module.exports = router;