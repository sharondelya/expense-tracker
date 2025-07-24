const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  processDueRecurringTransactions,
  getUpcomingRecurringTransactions
} = require('../controllers/recurringTransactionController');

// All recurring transaction routes require authentication
router.use(authMiddleware);

// GET /api/recurring-transactions
router.get('/', getRecurringTransactions);

// GET /api/recurring-transactions/upcoming
router.get('/upcoming', getUpcomingRecurringTransactions);

// POST /api/recurring-transactions
router.post('/', (req, res, next) => {
  console.log('🚀 POST /api/recurring-transactions endpoint hit!');
  console.log('Request body:', req.body);
  console.log('User from auth:', req.user?.id);
  next();
}, createRecurringTransaction);

// PUT /api/recurring-transactions/:id
router.put('/:id', updateRecurringTransaction);

// DELETE /api/recurring-transactions/:id
router.delete('/:id', deleteRecurringTransaction);

// POST /api/recurring-transactions/process-due (for cron job or manual processing)
router.post('/process-due', processDueRecurringTransactions);

module.exports = router;