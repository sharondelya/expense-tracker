const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  upload,
  uploadReceipt,
  getReceipt,
  getReceiptImage,
  deleteReceipt,
  getExpensesWithReceipts,
  bulkUploadReceipts,
  extractReceiptText
} = require('../controllers/receiptController');

// Upload receipt for a specific expense
router.post('/upload/:expenseId', authenticateToken, upload.single('receipt'), uploadReceipt);

// Get receipt metadata for a specific expense
router.get('/:expenseId', authenticateToken, getReceipt);

// Get receipt image data for a specific expense
router.get('/image/:expenseId', authenticateToken, getReceiptImage);

// Delete receipt for a specific expense
router.delete('/:expenseId', authenticateToken, deleteReceipt);

// Get all expenses with receipts
router.get('/', authenticateToken, getExpensesWithReceipts);

// Bulk upload receipts
router.post('/bulk-upload', authenticateToken, upload.array('receipts', 10), bulkUploadReceipts);

// Extract text from receipt (OCR)
router.post('/extract-text/:expenseId', authenticateToken, extractReceiptText);

module.exports = router;