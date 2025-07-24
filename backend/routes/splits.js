const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createExpenseSplit,
  getExpenseSplits,
  getUserSplits,
  updateSplitStatus,
  createSplitGroup,
  getUserSplitGroups,
  updateSplitGroup,
  deleteSplitGroup,
  getSplitSummary
} = require('../controllers/splitController');

// Create a new expense split
router.post('/', auth, createExpenseSplit);

// Get splits for a specific expense
router.get('/expense/:expenseId', auth, getExpenseSplits);

// Get all splits for the authenticated user
router.get('/', auth, getUserSplits);

// Update split status
router.patch('/:splitId/status', auth, updateSplitStatus);

// Get split summary/balance for user
router.get('/summary', auth, getSplitSummary);

// Split group routes
router.post('/groups', auth, createSplitGroup);
router.get('/groups', auth, getUserSplitGroups);
router.put('/groups/:groupId', auth, updateSplitGroup);
router.delete('/groups/:groupId', auth, deleteSplitGroup);

module.exports = router;