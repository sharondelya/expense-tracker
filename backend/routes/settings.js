const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');

// Apply authentication middleware to all settings routes
router.use(authMiddleware);

// Convert currency for all user data
router.post('/convert-currency', settingsController.convertCurrency);

module.exports = router;
