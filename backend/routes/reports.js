const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

// Get comprehensive report data
router.get('/', auth, reportController.getReports);

// Test endpoint for debugging
router.get('/test', auth, (req, res) => {
  console.log('📋 Test endpoint called successfully');
  res.json({ message: 'Reports endpoint working', timestamp: new Date().toISOString() });
});

// Export report in various formats
router.get('/export', auth, reportController.exportReport);

module.exports = router;