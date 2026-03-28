const express = require('express');
const router = express.Router();
const { submitFeedback, getUserFeedback } = require('../controllers/feedbackController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, submitFeedback);
router.get('/user', authMiddleware, getUserFeedback);

module.exports = router;
