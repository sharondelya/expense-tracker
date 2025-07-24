const User = require('../models/User');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const RecurringTransaction = require('../models/RecurringTransaction');
const ExpenseSplit = require('../models/ExpenseSplit');
const SplitGroup = require('../models/SplitGroup');
const FinancialGoal = require('../models/FinancialGoal');
const SavingsTransaction = require('../models/SavingsTransaction');

// Define associations
User.hasMany(Expense, { foreignKey: 'user_id', as: 'expenses' });
User.hasMany(Category, { foreignKey: 'user_id', as: 'categories' });
User.hasMany(RecurringTransaction, { foreignKey: 'user_id', as: 'recurringTransactions' });

Expense.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Expense.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Category self-referencing associations
Category.hasMany(Category, { as: 'subcategories', foreignKey: 'parent_id' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parent_id' });

Category.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Category.hasMany(Expense, { foreignKey: 'category_id', as: 'expenses' });
Category.hasMany(RecurringTransaction, { foreignKey: 'category_id', as: 'recurringTransactions' });

RecurringTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
RecurringTransaction.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Split-related associations
Expense.hasMany(ExpenseSplit, { foreignKey: 'expense_id', as: 'splits' });
ExpenseSplit.belongsTo(Expense, { foreignKey: 'expense_id' });

User.hasMany(ExpenseSplit, { foreignKey: 'payer_id', as: 'paidSplits' });
ExpenseSplit.belongsTo(User, { foreignKey: 'payer_id', as: 'payer' });

User.hasMany(SplitGroup, { foreignKey: 'creator_id', as: 'createdGroups' });
SplitGroup.belongsTo(User, { foreignKey: 'creator_id', as: 'creator' });

// Group-Split associations
SplitGroup.hasMany(ExpenseSplit, { foreignKey: 'group_id', as: 'splits' });
ExpenseSplit.belongsTo(SplitGroup, { foreignKey: 'group_id', as: 'group' });

// Financial Goal associations
User.hasMany(FinancialGoal, { foreignKey: 'user_id', as: 'financialGoals' });
FinancialGoal.belongsTo(User, { foreignKey: 'user_id' });

FinancialGoal.hasMany(SavingsTransaction, { foreignKey: 'goal_id', as: 'transactions' });
SavingsTransaction.belongsTo(FinancialGoal, { foreignKey: 'goal_id', as: 'goal' });

User.hasMany(SavingsTransaction, { foreignKey: 'user_id', as: 'savingsTransactions' });
SavingsTransaction.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  User,
  Expense,
  Category,
  RecurringTransaction,
  ExpenseSplit,
  SplitGroup,
  FinancialGoal,
  SavingsTransaction
};