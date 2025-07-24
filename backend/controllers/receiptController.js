const { Expense, Category } = require('../models');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

// Configure multer for memory storage (no file saving)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload receipt for an expense
const uploadReceipt = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.userId; // Updated to use req.userId instead of req.user.id

    // Check if expense exists and belongs to user
    const expense = await Expense.findOne({
      where: { id: expenseId, userId }
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Process image (resize and optimize) in memory
    const optimizedBuffer = await sharp(req.file.buffer)
      .resize(1200, 1200, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Update expense with receipt binary data
    const receiptData = {
      receiptData: optimizedBuffer, // Store binary data
      receiptOriginalName: req.file.originalname,
      receiptSize: optimizedBuffer.length,
      receiptMimeType: 'image/jpeg', // Always JPEG after processing
      receiptUploadedAt: new Date(),
      receiptUrl: null // Clear old file-based URL
    };

    await expense.update(receiptData);

    res.json({
      success: true,
      message: 'Receipt uploaded successfully',
      receipt: {
        originalName: receiptData.receiptOriginalName,
        size: receiptData.receiptSize,
        mimeType: receiptData.receiptMimeType,
        uploadedAt: receiptData.receiptUploadedAt
      }
    });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload receipt',
      error: error.message
    });
  }
};

// Get receipt for an expense
const getReceipt = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.userId; // Updated to use req.userId

    const expense = await Expense.findOne({
      where: { id: expenseId, userId },
      attributes: ['receiptData', 'receiptOriginalName', 'receiptSize', 'receiptMimeType', 'receiptUploadedAt']
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    if (!expense.receiptData) {
      return res.status(404).json({
        success: false,
        message: 'No receipt found for this expense'
      });
    }

    res.json({
      success: true,
      receipt: {
        originalName: expense.receiptOriginalName,
        size: expense.receiptSize,
        mimeType: expense.receiptMimeType,
        uploadedAt: expense.receiptUploadedAt
      }
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipt',
      error: error.message
    });
  }
};

// Get receipt image data (binary)
const getReceiptImage = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.userId;

    const expense = await Expense.findOne({
      where: { id: expenseId, userId },
      attributes: ['receiptData', 'receiptMimeType', 'receiptOriginalName']
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    if (!expense.receiptData) {
      return res.status(404).json({
        success: false,
        message: 'No receipt found for this expense'
      });
    }

    // Set appropriate headers for image response
    res.set({
      'Content-Type': expense.receiptMimeType || 'image/jpeg',
      'Content-Length': expense.receiptData.length,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'Content-Disposition': `inline; filename="${expense.receiptOriginalName || 'receipt.jpg'}"`
    });

    // Send the binary image data
    res.send(expense.receiptData);
  } catch (error) {
    console.error('Error fetching receipt image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipt image',
      error: error.message
    });
  }
};

// Delete receipt for an expense
const deleteReceipt = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.userId; // Updated to use req.userId

    const expense = await Expense.findOne({
      where: { id: expenseId, userId }
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    if (!expense.receiptData) {
      return res.status(404).json({
        success: false,
        message: 'No receipt found for this expense'
      });
    }

    // Update expense to remove receipt information
    await expense.update({
      receiptData: null,
      receiptUrl: null,
      receiptOriginalName: null,
      receiptSize: null,
      receiptMimeType: null,
      receiptUploadedAt: null
    });

    res.json({
      success: true,
      message: 'Receipt deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete receipt',
      error: error.message
    });
  }
};

// Get all expenses with receipts
const getExpensesWithReceipts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const expenses = await Expense.findAndCountAll({
      where: {
        userId,
        receiptData: { [require('sequelize').Op.not]: null }
      },
      include: [{
        model: Category,
        attributes: ['name', 'color', 'icon']
      }],
      order: [['receiptUploadedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      expenses: expenses.rows,
      pagination: {
        total: expenses.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(expenses.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching expenses with receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses with receipts',
      error: error.message
    });
  }
};

// Bulk upload receipts
const bulkUploadReceipts = async (req, res) => {
  try {
    const userId = req.user.id;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        // Process each file
        const originalPath = file.path;
        const optimizedPath = path.join(
          path.dirname(originalPath),
          `optimized-${file.filename}`
        );

        await sharp(originalPath)
          .resize(1200, 1200, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 85 })
          .toFile(optimizedPath);

        // Remove original file
        await fs.unlink(originalPath);

        results.push({
          filename: file.filename,
          originalName: file.originalname,
          url: `/uploads/receipts/optimized-${file.filename}`,
          size: file.size,
          mimeType: file.mimetype
        });
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} files successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload',
      error: error.message
    });
  }
};

// OCR text extraction from receipt (placeholder for future implementation)
const extractReceiptText = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user.id;

    const expense = await Expense.findOne({
      where: { id: expenseId, userId }
    });

    if (!expense || !expense.receiptData) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Placeholder for OCR implementation
    // In a real application, you would integrate with services like:
    // - Google Cloud Vision API
    // - AWS Textract
    // - Azure Computer Vision
    // - Tesseract.js for client-side OCR

    res.json({
      success: true,
      message: 'OCR feature coming soon',
      extractedText: 'OCR text extraction will be implemented in future updates'
    });
  } catch (error) {
    console.error('Error extracting receipt text:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract receipt text',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  uploadReceipt,
  getReceipt,
  getReceiptImage,
  deleteReceipt,
  getExpensesWithReceipts,
  bulkUploadReceipts,
  extractReceiptText
};