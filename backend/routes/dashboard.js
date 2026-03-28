const express = require('express');
const router = express.Router();
const { getDashboardData, updateBinFromIoT, dispatchCollection, getLiveMapData, getZonesData, resolveAlert, getUserDashboardData } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/municipal', getDashboardData);
router.get('/user', authMiddleware, getUserDashboardData);
router.post('/iot-update', updateBinFromIoT);
router.post('/dispatch', dispatchCollection);

router.get('/bins/all', getLiveMapData);
router.get('/alerts', getLiveMapData);
router.get('/zones', getZonesData);
router.post('/alerts/resolve', resolveAlert);

module.exports = router;
