const Complaint = require('../models/Complaint');

exports.submitComplaint = async (req, res) => {
  try {
    const { name, location, issueType, description } = req.body;
    const userId = req.user.id;
    // req.file contains the image if uploaded
    const imageURL = req.file ? `/uploads/${req.file.filename}` : null;

    if (!location || !issueType || !description) {
      return res.status(400).json({ message: 'Please provide location, type, and description.' });
    }

    const complaint = await Complaint.create({
      userId,
      name,
      location,
      issueType,
      description,
      imageURL
    });

    res.status(201).json({ success: true, complaint, message: 'Complaint sent to municipality successfully' });
  } catch (error) {
    console.error('Complaint Error:', error);
    res.status(500).json({ message: 'Error submitting complaint' });
  }
};

exports.getUserComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user.id }).sort('-createdAt');
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints' });
  }
};

exports.getAdminComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().populate('userId', 'name email').sort('-createdAt');
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin complaints' });
  }
};
