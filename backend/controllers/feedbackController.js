const Feedback = require('../models/Feedback');

exports.submitFeedback = async (req, res) => {
  try {
    const { location, rating, issueType, comment } = req.body;
    const userId = req.user.id;

    if (!location || !rating || !issueType) {
      return res.status(400).json({ message: 'Please provide location, rating, and issue type.' });
    }

    const feedback = await Feedback.create({
      userId,
      location,
      rating,
      issueType,
      comment
    });

    res.status(201).json({ success: true, feedback, message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Feedback Error:', error);
    res.status(500).json({ message: 'Server error processing feedback' });
  }
};

exports.getUserFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({ userId: req.user.id }).sort('-createdAt');
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feedback' });
  }
};
