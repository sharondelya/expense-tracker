const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  createDefaultCategories,
  getCategoryTrends
} = require('../controllers/categoryController');
const auth = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// GET /api/categories - Get all categories for the authenticated user
router.get('/', getCategories);

// GET /api/categories/trends - Get category spending trends
router.get('/trends', getCategoryTrends);

// POST /api/categories/default - Create default categories for new user
router.post('/default', createDefaultCategories);

// POST /api/categories/reorder - Reorder categories
router.post('/reorder', reorderCategories);

// GET /api/categories/:id - Get a specific category by ID
router.get('/:id', getCategoryById);

// POST /api/categories - Create a new category
router.post('/', createCategory);

// PUT /api/categories/:id - Update a category
router.put('/:id', updateCategory);

// DELETE /api/categories/:id - Delete a category
router.delete('/:id', deleteCategory);

module.exports = router;