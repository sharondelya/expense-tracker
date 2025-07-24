const express = require('express');
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Custom auth middleware for export route that handles both header and query token
const exportAuthMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token || req.query.authToken;
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Apply auth middleware to most routes
router.get('/', authMiddleware, expenseController.getExpenses);
router.post('/', authMiddleware, expenseController.createExpense);
router.get('/stats', authMiddleware, expenseController.getExpenseStats);
router.get('/export', exportAuthMiddleware, expenseController.exportExpenses); // Use custom auth for export
router.get('/:id', authMiddleware, expenseController.getExpense);
router.put('/:id', authMiddleware, expenseController.updateExpense);
router.delete('/:id', authMiddleware, expenseController.deleteExpense);

module.exports = router;