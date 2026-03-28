const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const deviceController = require('../controllers/deviceController');

router.use(authMiddleware);

router.get('/', deviceController.getDeviceState);
router.post('/', deviceController.updateDeviceState);

module.exports = router;
