const Category = require('../models/Category');
const Expense = require('../models/Expense');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Get all categories for a user
const getCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, includeStats, includeInactive } = req.query;
    
    const options = {
      type,
      includeStats: includeStats === 'true',
      isActive: includeInactive === 'true' ? undefined : true
    };
    
    const categories = await Category.getByUserWithStats(userId, options);
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

// Get a single category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const category = await Category.findOne({
      where: { id, userId },
      include: [
        {
          model: Category,
          as: 'subcategories',
          where: { isActive: true },
          required: false
        },
        {
          model: Category,
          as: 'parent',
          required: false
        }
      ]
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Get category statistics
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
    
    const [monthlyStats, yearlyStats, recentTransactions] = await Promise.all([
      Expense.findAll({
        where: {
          categoryId: category.id,
          date: { [Op.between]: [startOfMonth, endOfMonth] }
        },
        attributes: [
          'type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total']
        ],
        group: ['type'],
        raw: true
      }),
      Expense.findAll({
        where: {
          categoryId: category.id,
          date: { [Op.between]: [startOfYear, new Date()] }
        },
        attributes: [
          'type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total']
        ],
        group: ['type'],
        raw: true
      }),
      Expense.findAll({
        where: { categoryId: category.id },
        order: [['date', 'DESC']],
        limit: 10
      })
    ]);
    
    const stats = {
      monthly: {
        expenses: monthlyStats.find(s => s.type === 'expense') || { count: 0, total: 0 },
        income: monthlyStats.find(s => s.type === 'income') || { count: 0, total: 0 }
      },
      yearly: {
        expenses: yearlyStats.find(s => s.type === 'expense') || { count: 0, total: 0 },
        income: yearlyStats.find(s => s.type === 'income') || { count: 0, total: 0 }
      },
      recentTransactions
    };
    
    // Check budget status
    if (category.monthlyBudget) {
      const expenseTotal = stats.monthly.expenses.total || 0;
      stats.budgetStatus = {
        isOverBudget: expenseTotal > category.monthlyBudget,
        usagePercentage: (expenseTotal / category.monthlyBudget) * 100,
        remaining: category.monthlyBudget - expenseTotal
      };
    }
    
    res.json({
      success: true,
      category: {
        ...category.toJSON(),
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
};

// Create a new category
const createCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      color,
      icon,
      type,
      parentId,
      monthlyBudget,
      budgetLimit
    } = req.body;
    
    // Check if category name already exists for this user
    const existingCategory = await Category.findOne({
      where: { name, userId }
    });
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    
    // If parentId is provided, verify it exists and belongs to the user
    if (parentId) {
      const parentCategory = await Category.findOne({
        where: { id: parentId, userId }
      });
      
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }
    
    // Get the next sort order
    const maxSortOrder = await Category.max('sortOrder', {
      where: { userId, parentId: parentId || null }
    });
    
    const category = await Category.create({
      name,
      description,
      color: color || '#3B82F6',
      icon: icon || 'FolderOpen',
      type: type || 'both',
      parentId: parentId || null,
      monthlyBudget: monthlyBudget || null,
      budgetLimit: budgetLimit || null,
      sortOrder: (maxSortOrder || 0) + 1,
      userId
    });
    
    // Fetch the created category with associations
    const createdCategory = await Category.findByPk(category.id, {
      include: [
        {
          model: Category,
          as: 'subcategories',
          where: { isActive: true },
          required: false
        },
        {
          model: Category,
          as: 'parent',
          required: false
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: createdCategory
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

// Update a category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      name,
      description,
      color,
      icon,
      type,
      parentId,
      monthlyBudget,
      budgetLimit,
      isActive
    } = req.body;
    
    const category = await Category.findOne({
      where: { id, userId }
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if new name conflicts with existing categories
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        where: { name, userId, id: { [Op.ne]: id } }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }
    
    // If parentId is being changed, verify it exists and belongs to the user
    if (parentId !== undefined && parentId !== category.parentId) {
      if (parentId) {
        const parentCategory = await Category.findOne({
          where: { id: parentId, userId }
        });
        
        if (!parentCategory) {
          return res.status(400).json({
            success: false,
            message: 'Parent category not found'
          });
        }
        
        // Prevent circular references
        if (parentId === category.id) {
          return res.status(400).json({
            success: false,
            message: 'Category cannot be its own parent'
          });
        }
      }
    }
    
    // Update the category
    await category.update({
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      color: color || category.color,
      icon: icon || category.icon,
      type: type || category.type,
      parentId: parentId !== undefined ? parentId : category.parentId,
      monthlyBudget: monthlyBudget !== undefined ? monthlyBudget : category.monthlyBudget,
      budgetLimit: budgetLimit !== undefined ? budgetLimit : category.budgetLimit,
      isActive: isActive !== undefined ? isActive : category.isActive
    });
    
    // Fetch the updated category with associations
    const updatedCategory = await Category.findByPk(category.id, {
      include: [
        {
          model: Category,
          as: 'subcategories',
          where: { isActive: true },
          required: false
        },
        {
          model: Category,
          as: 'parent',
          required: false
        }
      ]
    });
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      category: updatedCategory
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

// Delete a category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reassignTo } = req.body;
    
    const category = await Category.findOne({
      where: { id, userId }
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if category has transactions
    const transactionCount = await Expense.count({
      where: { categoryId: id }
    });
    
    if (transactionCount > 0) {
      if (reassignTo) {
        // Verify the reassign category exists and belongs to the user
        const reassignCategory = await Category.findOne({
          where: { id: reassignTo, userId }
        });
        
        if (!reassignCategory) {
          return res.status(400).json({
            success: false,
            message: 'Reassign category not found'
          });
        }
        
        // Reassign all transactions to the new category
        await Expense.update(
          { categoryId: reassignTo },
          { where: { categoryId: id } }
        );
      } else {
        // Set transactions to null category
        await Expense.update(
          { categoryId: null },
          { where: { categoryId: id } }
        );
      }
    }
    
    // Handle subcategories
    const subcategories = await Category.findAll({
      where: { parentId: id, userId }
    });
    
    if (subcategories.length > 0) {
      // Move subcategories to parent level or reassign parent
      await Category.update(
        { parentId: category.parentId },
        { where: { parentId: id, userId } }
      );
    }
    
    // Delete the category
    await category.destroy();
    
    res.json({
      success: true,
      message: 'Category deleted successfully',
      reassignedTransactions: transactionCount,
      movedSubcategories: subcategories.length
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

// Reorder categories
const reorderCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categories } = req.body; // Array of { id, sortOrder }
    
    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Categories must be an array'
      });
    }
    
    // Update sort orders
    const updatePromises = categories.map(({ id, sortOrder }) =>
      Category.update(
        { sortOrder },
        { where: { id, userId } }
      )
    );
    
    await Promise.all(updatePromises);
    
    res.json({
      success: true,
      message: 'Categories reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder categories',
      error: error.message
    });
  }
};

// Create default categories for a new user
const createDefaultCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user already has categories
    const existingCategories = await Category.count({
      where: { userId }
    });
    
    if (existingCategories > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already has categories'
      });
    }
    
    const categories = await Category.createDefaultCategories(userId);
    
    res.json({
      success: true,
      message: 'Default categories created successfully',
      categories
    });
  } catch (error) {
    console.error('Error creating default categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create default categories',
      error: error.message
    });
  }
};

// Get category spending trends
const getCategoryTrends = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId, period = '6months' } = req.query;
    
    let startDate;
    const endDate = new Date();
    
    switch (period) {
      case '3months':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6months':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
    }
    
    const whereClause = {
      userId,
      date: { [Op.between]: [startDate, endDate] }
    };
    
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    
    const trends = await Expense.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'month'],
        'categoryId',
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      include: [{
        model: Category,
        attributes: ['name', 'color', 'icon']
      }],
      group: ['month', 'categoryId', 'type', 'Category.id'],
      order: [['month', 'ASC']]
    });
    
    res.json({
      success: true,
      trends
    });
  } catch (error) {
    console.error('Error fetching category trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category trends',
      error: error.message
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  createDefaultCategories,
  getCategoryTrends
};