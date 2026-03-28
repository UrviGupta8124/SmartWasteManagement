const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const rewardController = require('../controllers/rewardController');

router.get('/', authMiddleware, rewardController.getRewards);
router.post('/redeem', authMiddleware, rewardController.redeemReward);
router.get('/history', authMiddleware, rewardController.getHistory);

module.exports = router;
