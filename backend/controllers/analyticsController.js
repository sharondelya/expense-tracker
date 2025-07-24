const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Expense = require('../models/Expense');
const Category = require('../models/Category');

// Get analytics overview
const getOverview = async (req, res) => {
  try {
    const userId = req.userId;
    const { timeRange = 'month' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get current period transactions
    const currentTransactions = await Expense.findAll({
      where: {
        userId,
        date: {
          [Op.gte]: startDate,
          [Op.lte]: now
        }
      }
    });

    // Calculate previous period for comparison
    const periodLength = now.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    
    const previousTransactions = await Expense.findAll({
      where: {
        userId,
        date: {
          [Op.gte]: previousStartDate,
          [Op.lt]: startDate
        }
      }
    });

    // Calculate totals
    const currentExpenses = currentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const currentIncome = currentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const previousExpenses = previousTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Calculate growth
    const expenseGrowth = previousExpenses > 0 
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 
      : 0;

    const netSavings = currentIncome - currentExpenses;
    const savingsRate = currentIncome > 0 ? (netSavings / currentIncome) * 100 : 0;

    res.json({
      totalExpenses: currentExpenses,
      totalIncome: currentIncome,
      netSavings,
      expenseGrowth: parseFloat(expenseGrowth.toFixed(1)),
      savingsRate: parseFloat(savingsRate.toFixed(1))
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
};

// Get category breakdown
const getCategoryBreakdown = async (req, res) => {
  try {
    const userId = req.userId;
    const { timeRange = 'month' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get category breakdown
    const categoryData = await Expense.findAll({
      attributes: [
        'categoryId',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: {
        userId,
        type: 'expense',
        date: {
          [Op.gte]: startDate,
          [Op.lte]: now
        }
      },
      group: ['categoryId', 'category.id', 'category.name', 'category.color'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color']
      }]
    });

    const totalExpenses = categoryData.reduce((sum, item) => sum + parseFloat(item.dataValues.total), 0);

    // Define category colors
    const categoryColors = {
      'Food & Dining': '#EF4444',
      'Transportation': '#3B82F6',
      'Shopping': '#10B981',
      'Entertainment': '#F59E0B',
      'Bills & Utilities': '#8B5CF6',
      'Healthcare': '#EC4899',
      'Education': '#14B8A6',
      'Travel': '#F97316',
      'Others': '#6B7280'
    };

    const breakdown = categoryData.map(item => {
      const amount = parseFloat(item.dataValues.total);
      const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
      const categoryName = item.category?.name || 'Uncategorized';
      
      return {
        category: categoryName,
        amount,
        percentage: parseFloat(percentage.toFixed(1)),
        color: item.category?.color || categoryColors[categoryName] || '#6B7280'
      };
    });

    res.json(breakdown);
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch category breakdown' });
  }
};

// Get trends data
const getTrends = async (req, res) => {
  try {
    const userId = req.userId;
    const { timeRange = 'month' } = req.query;

    // Get monthly trends for the past 6 months
    const monthlyData = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const transactions = await Expense.findAll({
        where: {
          userId,
          date: {
            [Op.gte]: monthStart,
            [Op.lte]: monthEnd
          }
        }
      });

      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        expenses,
        income
      });
    }

    // Get weekly data for current month
    const weeklyData = [];
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayExpenses = await Expense.sum('amount', {
        where: {
          userId,
          type: 'expense',
          date: {
            [Op.gte]: dayStart,
            [Op.lte]: dayEnd
          }
        }
      }) || 0;

      weeklyData.push({
        day: daysOfWeek[i],
        amount: parseFloat(dayExpenses)
      });
    }

    res.json({
      monthlyData,
      weeklyData
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends data' });
  }
};

// Get top expenses
const getTopExpenses = async (req, res) => {
  try {
    const userId = req.userId;
    const { timeRange = 'month' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const topExpenses = await Expense.findAll({
      where: {
        userId,
        type: 'expense',
        date: {
          [Op.gte]: startDate,
          [Op.lte]: now
        }
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name', 'color']
      }],
      order: [['amount', 'DESC']],
      limit: 5
    });

    const formattedExpenses = topExpenses.map(expense => ({
      description: expense.description,
      amount: parseFloat(expense.amount),
      category: expense.category?.name || 'Uncategorized',
      date: typeof expense.date === 'string' ? expense.date : expense.date.toISOString().split('T')[0]
    }));

    res.json(formattedExpenses);
  } catch (error) {
    console.error('Error fetching top expenses:', error);
    res.status(500).json({ error: 'Failed to fetch top expenses' });
  }
};

module.exports = {
  getOverview,
  getCategoryBreakdown,
  getTrends,
  getTopExpenses
};