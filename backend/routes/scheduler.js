const express = require('express');
const router = express.Router();
const schedulerService = require('../services/schedulerService');
const auth = require('../middleware/auth');

// Get scheduler status
router.get('/status', auth, (req, res) => {
  try {
    const status = schedulerService.getStatus();
    res.json({
      message: 'Scheduler status retrieved successfully',
      ...status
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test budget alerts (immediate execution)
router.post('/test/budget-alerts', auth, async (req, res) => {
  try {
    console.log('🧪 Manual test: Budget alerts triggered by user:', req.user.email);
    await schedulerService.testBudgetAlerts();
    res.json({ 
      message: 'Budget alerts test completed successfully!',
      note: 'Check console logs for detailed results'
    });
  } catch (error) {
    console.error('Error testing budget alerts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test weekly reports (immediate execution)
router.post('/test/weekly-reports', auth, async (req, res) => {
  try {
    console.log('🧪 Manual test: Weekly reports triggered by user:', req.user.email);
    await schedulerService.testWeeklyReports();
    res.json({ 
      message: 'Weekly reports test completed successfully!',
      note: 'Check your email and console logs for results'
    });
  } catch (error) {
    console.error('Error testing weekly reports:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test monthly reports (immediate execution)
router.post('/test/monthly-reports', auth, async (req, res) => {
  try {
    console.log('🧪 Manual test: Monthly reports triggered by user:', req.user.email);
    await schedulerService.testMonthlyReports();
    res.json({ 
      message: 'Monthly reports test completed successfully!',
      note: 'Check your email and console logs for results'
    });
  } catch (error) {
    console.error('Error testing monthly reports:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test recurring transactions (immediate execution)
router.post('/test/recurring-transactions', auth, async (req, res) => {
  try {
    console.log('🧪 Manual test: Recurring transactions triggered by user:', req.user.email);
    await schedulerService.testRecurringTransactions();
    res.json({ 
      message: 'Recurring transactions test completed successfully!',
      note: 'Check console logs for processing results'
    });
  } catch (error) {
    console.error('Error testing recurring transactions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start scheduler (admin only - for manual control)
router.post('/start', auth, (req, res) => {
  try {
    schedulerService.start();
    res.json({ message: 'Scheduler started successfully!' });
  } catch (error) {
    console.error('Error starting scheduler:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Stop scheduler (admin only - for manual control)
router.post('/stop', auth, (req, res) => {
  try {
    schedulerService.stop();
    res.json({ message: 'Scheduler stopped successfully!' });
  } catch (error) {
    console.error('Error stopping scheduler:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
