const User = require('../models/User');

exports.getDeviceState = async (req, res) => {
  try {
    // req.user is set by authMiddleware
    res.status(200).json({ deviceState: req.user.deviceState });
  } catch (error) {
    console.error('Get device state error:', error);
    res.status(500).json({ message: 'Server error retrieving device state' });
  }
};

exports.updateDeviceState = async (req, res) => {
  try {
    const { led, fanSpeed } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (led !== undefined) {
      user.deviceState.led = led;
    }
    if (fanSpeed !== undefined) {
      user.deviceState.fanSpeed = fanSpeed;
    }

    await user.save();

    // Simulate hardware API call / synchronisation
    console.log(`[HARDWARE SYNC] Emitting changes to device for user ${user.email}`);
    console.log(`[HARDWARE SYNC] New State -> LED: ${user.deviceState.led}, FanSpeed: ${user.deviceState.fanSpeed}`);

    res.status(200).json({
      message: 'Device state updated successfully',
      deviceState: user.deviceState
    });
  } catch (error) {
    console.error('Update device state error:', error);
    res.status(500).json({ message: 'Server error updating device state' });
  }
};
