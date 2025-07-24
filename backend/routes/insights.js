const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  getSpendingInsights,
  getSpendingTrends,
  getRecommendations
} = require('../controllers/insightsController');

// Get comprehensive spending insights
router.get('/spending', authenticateToken, getSpendingInsights);

// Get spending trends over time
router.get('/trends', authenticateToken, getSpendingTrends);

// Get personalized recommendations
router.get('/recommendations', authenticateToken, getRecommendations);

module.exports = router;