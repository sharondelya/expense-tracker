const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '#3B82F6',
    validate: {
      isHexColor(value) {
        if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
          throw new Error('Color must be a valid hex color code');
        }
      }
    }
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'FolderOpen',
    validate: {
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.ENUM('expense', 'income', 'both'),
    allowNull: false,
    defaultValue: 'both'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  budgetLimit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  monthlyBudget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'categories',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['parent_id']
    },
    {
      unique: true,
      fields: ['user_id', 'name']
    }
  ]
});

// Define associations
Category.associate = (models) => {
  // Self-referencing association for subcategories
  Category.hasMany(models.Category, {
    as: 'subcategories',
    foreignKey: 'parentId'
  });
  
  Category.belongsTo(models.Category, {
    as: 'parent',
    foreignKey: 'parentId'
  });
  
  // Association with User
  Category.belongsTo(models.User, {
    foreignKey: 'userId',
    onDelete: 'CASCADE'
  });
  
  // Association with Expenses
  Category.hasMany(models.Expense, {
    foreignKey: 'categoryId',
    onDelete: 'SET NULL'
  });
  
  // Association with RecurringTransactions
  if (models.RecurringTransaction) {
    Category.hasMany(models.RecurringTransaction, {
      foreignKey: 'categoryId',
      onDelete: 'SET NULL'
    });
  }
};

// Instance methods
Category.prototype.getFullName = function() {
  if (this.parent) {
    return `${this.parent.name} > ${this.name}`;
  }
  return this.name;
};

Category.prototype.isOverBudget = async function(month = null, year = null) {
  if (!this.monthlyBudget) return false;
  
  const currentDate = new Date();
  const targetMonth = month || currentDate.getMonth() + 1;
  const targetYear = year || currentDate.getFullYear();
  
  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0);
  
  const Expense = require('./Expense');
  const totalSpent = await Expense.sum('amount', {
    where: {
      categoryId: this.id,
      type: 'expense',
      date: {
        [require('sequelize').Op.between]: [startDate, endDate]
      }
    }
  });
  
  return totalSpent > this.monthlyBudget;
};

// Class methods
Category.createDefaultCategories = async function(userId) {
  const defaultCategories = [
    // Expense Categories
    { name: 'Food & Dining', icon: 'Utensils', color: '#EF4444', type: 'expense', isDefault: true },
    { name: 'Transportation', icon: 'Car', color: '#3B82F6', type: 'expense', isDefault: true },
    { name: 'Shopping', icon: 'ShoppingBag', color: '#8B5CF6', type: 'expense', isDefault: true },
    { name: 'Entertainment', icon: 'Film', color: '#F59E0B', type: 'expense', isDefault: true },
    { name: 'Bills & Utilities', icon: 'Receipt', color: '#10B981', type: 'expense', isDefault: true },
    { name: 'Healthcare', icon: 'Heart', color: '#EC4899', type: 'expense', isDefault: true },
    { name: 'Education', icon: 'BookOpen', color: '#6366F1', type: 'expense', isDefault: true },
    { name: 'Travel', icon: 'Plane', color: '#14B8A6', type: 'expense', isDefault: true },
    { name: 'Home & Garden', icon: 'Home', color: '#84CC16', type: 'expense', isDefault: true },
    { name: 'Personal Care', icon: 'User', color: '#F97316', type: 'expense', isDefault: true },
    
    // Income Categories
    { name: 'Salary', icon: 'Briefcase', color: '#059669', type: 'income', isDefault: true },
    { name: 'Freelance', icon: 'Laptop', color: '#0891B2', type: 'income', isDefault: true },
    { name: 'Investment', icon: 'TrendingUp', color: '#7C3AED', type: 'income', isDefault: true },
    { name: 'Business', icon: 'Building', color: '#DC2626', type: 'income', isDefault: true },
    { name: 'Rental', icon: 'Key', color: '#9333EA', type: 'income', isDefault: true },
    { name: 'Gift', icon: 'Gift', color: '#DB2777', type: 'income', isDefault: true },
    
    // Both Categories
    { name: 'Others', icon: 'MoreHorizontal', color: '#6B7280', type: 'both', isDefault: true }
  ];
  
  const categories = [];
  for (let i = 0; i < defaultCategories.length; i++) {
    const categoryData = { ...defaultCategories[i], userId, sortOrder: i };
    categories.push(await Category.create(categoryData));
  }
  
  return categories;
};

Category.getByUserWithStats = async function(userId, options = {}) {
  const Expense = require('./Expense');
  const { Op } = require('sequelize');
  
  const whereClause = { userId };
  if (options.type) {
    whereClause.type = options.type === 'both' ? { [Op.in]: ['expense', 'income', 'both'] } : { [Op.in]: [options.type, 'both'] };
  }
  if (options.isActive !== undefined) {
    whereClause.isActive = options.isActive;
  }
  
  const categories = await Category.findAll({
    where: whereClause,
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
    ],
    order: [['sortOrder', 'ASC'], ['name', 'ASC']]
  });
  
  // Add transaction stats if requested
  if (options.includeStats) {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    for (const category of categories) {
      const stats = await Expense.findAll({
        where: {
          categoryId: category.id,
          date: {
            [Op.between]: [startOfMonth, endOfMonth]
          }
        },
        attributes: [
          'type',
          [require('../config/database').fn('COUNT', require('../config/database').col('id')), 'count'],
          [require('../config/database').fn('SUM', require('../config/database').col('amount')), 'total']
        ],
        group: ['type'],
        raw: true
      });
      
      category.dataValues.monthlyStats = {
        expenses: stats.find(s => s.type === 'expense') || { count: 0, total: 0 },
        income: stats.find(s => s.type === 'income') || { count: 0, total: 0 }
      };
      
      // Check if over budget
      if (category.monthlyBudget) {
        const expenseTotal = category.dataValues.monthlyStats.expenses.total || 0;
        category.dataValues.isOverBudget = expenseTotal > category.monthlyBudget;
        category.dataValues.budgetUsagePercentage = (expenseTotal / category.monthlyBudget) * 100;
      }
    }
  }
  
  return categories;
};

module.exports = Category;