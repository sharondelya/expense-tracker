const express = require('express');
const router = express.Router();
const {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addSavings,
  withdrawSavings,
  getSavingsStats
} = require('../controllers/goalsController');
const auth = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Goal management routes
router.get('/', getGoals);
router.post('/', (req, res, next) => {
  console.log('🚀 POST /api/goals endpoint hit!');
  console.log('Request body:', req.body);
  console.log('User from auth:', req.user?.id);
  next();
}, createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

// Savings transaction routes
router.post('/:goalId/savings', (req, res, next) => {
  console.log('🚀 POST /api/goals/:goalId/savings endpoint hit!');
  console.log('Goal ID:', req.params.goalId);
  console.log('Request body:', req.body);
  console.log('User from auth:', req.user?.id);
  next();
}, addSavings);
router.post('/:goalId/withdraw', withdrawSavings);

// Statistics route
router.get('/stats', getSavingsStats);

module.exports = router;