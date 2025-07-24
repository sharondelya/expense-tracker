const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

// Log to verify controller is loaded
console.log('🔍 Notification controller loaded:', typeof notificationController);
console.log('🔍 Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(notificationController)));
console.log('🔍 testEmail method exists:', typeof notificationController.testEmail);
console.log('🔍 triggerWeeklyReport method exists:', typeof notificationController.triggerWeeklyReport);

// Test endpoint to verify route registration
router.get('/test', (req, res) => {
  console.log('📧 Notifications route is working!');
  res.json({ message: 'Notifications route is working!' });
});

// Simple email service test (no auth required)
router.get('/test-email-service', (req, res) => {
  console.log('📧 Testing email service...');
  res.json({ 
    message: 'Email service test endpoint', 
    note: 'Use POST /test-email with authentication for full test' 
  });
});

// Test email functionality
router.get('/test-email', auth, notificationController.testEmail);
router.post('/test-email', (req, res, next) => {
  console.log('📧 Test email POST route hit');
  next();
}, auth, notificationController.testEmail);

// Manual triggers for reports
router.post('/weekly-report', auth, notificationController.triggerWeeklyReport);
router.post('/monthly-report', auth, notificationController.triggerMonthlyReport);

module.exports = router;