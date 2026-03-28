const express = require('express');
const router = express.Router();
const { submitComplaint, getUserComplaints, getAdminComplaints } = require('../controllers/complaintController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.post('/', authMiddleware, upload.single('image'), submitComplaint);
router.get('/user', authMiddleware, getUserComplaints);
router.get('/admin', authMiddleware, getAdminComplaints);

module.exports = router;
