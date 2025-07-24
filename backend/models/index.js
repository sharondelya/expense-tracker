const User = require('./User');
const Expense = require('./Expense');
const Category = require('./Category');
const RecurringTransaction = require('./RecurringTransaction');
const ExpenseSplit = require('./ExpenseSplit');
const SplitGroup = require('./SplitGroup');
const FinancialGoal = require('./FinancialGoal');
const SavingsTransaction = require('./SavingsTransaction');

// Associations are defined in config/associations.js

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