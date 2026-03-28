const Reward = require('../models/Reward');
const Redemption = require('../models/Redemption');
const User = require('../models/User');

exports.getRewards = async (req, res) => {
  try {
    const rewards = await Reward.find();
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving rewards' });
  }
};

exports.redeemReward = async (req, res) => {
  try {
    const { rewardId } = req.body;
    const userId = req.user.id; // from authMiddleware

    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    if (reward.status === 'out_of_stock') {
      return res.status(400).json({ message: 'Reward out of stock' });
    }

    const user = await User.findById(userId);
    if (user.points < reward.pointsCost) {
      return res.status(400).json({ message: 'Not enough points' });
    }

    // Deduct points
    user.points -= reward.pointsCost;
    await user.save();

    // Log redemption
    const redemption = await Redemption.create({
      user: userId,
      reward: reward._id,
      pointsDeducted: reward.pointsCost
    });

    res.status(200).json({ 
      message: 'Reward redeemed successfully', 
      userPoints: user.points, 
      redemption 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error processing redemption' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const history = await Redemption.find({ user: req.user.id })
      .populate('reward', 'title description iconType')
      .sort({ redeemedAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving history' });
  }
};
