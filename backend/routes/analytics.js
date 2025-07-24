const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getOverview,
  getCategoryBreakdown,
  getTrends,
  getTopExpenses
} = require('../controllers/analyticsController');
const reportController = require('../controllers/reportController');

// All analytics routes require authentication
router.use(authMiddleware);

// GET /api/analytics/overview
router.get('/overview', getOverview);

// GET /api/analytics/categories
router.get('/categories', getCategoryBreakdown);

// GET /api/analytics/trends
router.get('/trends', getTrends);

// GET /api/analytics/top-expenses
router.get('/top-expenses', getTopExpenses);

// GET /api/analytics/reports - Get comprehensive report data
router.get('/reports', reportController.getReports);

// GET /api/analytics/reports/export - Export report in various formats
router.get('/reports/export', reportController.exportReport);

module.exports = router;