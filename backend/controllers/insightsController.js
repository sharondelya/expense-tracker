const { Expense, Category, User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Get comprehensive spending insights
const getSpendingInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '3months' } = req.query;
    
    // Calculate date ranges
    const now = new Date();
    let startDate, compareStartDate;
    
    switch (period) {
      case '1month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        compareStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        compareStartDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        break;
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        compareStartDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        break;
      case '1year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        compareStartDate = new Date(now.getFullYear() - 2, now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        compareStartDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }
    
    const compareEndDate = new Date(startDate.getTime() - 1);
    
    // Get current period data
    const currentExpenses = await Expense.findAll({
      where: {
        userId,
        type: 'expense',
        date: { [Op.between]: [startDate, now] }
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name', 'color', 'icon']
      }]
    });
    
    // Get comparison period data
    const compareExpenses = await Expense.findAll({
      where: {
        userId,
        type: 'expense',
        date: { [Op.between]: [compareStartDate, compareEndDate] }
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name', 'color', 'icon']
      }]
    });
    
    // Calculate insights
    const insights = await calculateInsights(currentExpenses, compareExpenses, userId, period);
    
    res.json({
      success: true,
      insights,
      period,
      dateRange: {
        start: startDate,
        end: now,
        compareStart: compareStartDate,
        compareEnd: compareEndDate
      }
    });
  } catch (error) {
    console.error('Error fetching spending insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch spending insights',
      error: error.message
    });
  }
};

// Get spending trends over time
const getSpendingTrends = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '12months', granularity = 'month' } = req.query;
    
    const now = new Date();
    let startDate, dateFormat, groupBy;
    
    switch (period) {
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFormat = granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';
        groupBy = granularity === 'day' ? 'day' : 'month';
        break;
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        dateFormat = 'YYYY-MM';
        groupBy = 'month';
        break;
      case '12months':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        dateFormat = 'YYYY-MM';
        groupBy = 'month';
        break;
      case '2years':
        startDate = new Date(now.getFullYear() - 2, now.getMonth(), 1);
        dateFormat = 'YYYY-MM';
        groupBy = 'month';
        break;
      default:
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        dateFormat = 'YYYY-MM';
        groupBy = 'month';
    }
    
    // Get trending data
    const trendData = await Expense.findAll({
      where: {
        userId,
        date: { [Op.between]: [startDate, now] }
      },
      attributes: [
        [sequelize.fn('DATE_TRUNC', groupBy, sequelize.col('date')), 'period'],
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'average']
      ],
      group: ['period', 'type'],
      order: [['period', 'ASC']]
    });
    
    // Get category trends
    const categoryTrends = await Expense.findAll({
      where: {
        userId,
        type: 'expense',
        date: { [Op.between]: [startDate, now] }
      },
      attributes: [
        [sequelize.fn('DATE_TRUNC', groupBy, sequelize.col('date')), 'period'],
        'categoryId',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name', 'color', 'icon']
      }],
      group: ['period', 'categoryId', 'category.id'],
      order: [['period', 'ASC']]
    });
    
    // Process and format trend data
    const processedTrends = processTrendData(trendData, categoryTrends, groupBy);
    
    res.json({
      success: true,
      trends: processedTrends,
      period,
      granularity,
      dateRange: { start: startDate, end: now }
    });
  } catch (error) {
    console.error('Error fetching spending trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch spending trends',
      error: error.message
    });
  }
};

// Get personalized recommendations
const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data and spending patterns
    const user = await User.findByPk(userId);
    const recommendations = await generateRecommendations(userId, user);
    
    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: error.message
    });
  }
};

// Helper function to calculate insights
async function calculateInsights(currentExpenses, compareExpenses, userId, period) {
  const currentTotal = currentExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const compareTotal = compareExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  
  // Calculate percentage change
  const percentageChange = compareTotal > 0 ? ((currentTotal - compareTotal) / compareTotal) * 100 : 0;
  
  // Category analysis
  const categorySpending = {};
  const categoryComparison = {};
  
  currentExpenses.forEach(exp => {
    const categoryName = exp.category?.name || 'Uncategorized';
    categorySpending[categoryName] = (categorySpending[categoryName] || 0) + parseFloat(exp.amount);
  });
  
  compareExpenses.forEach(exp => {
    const categoryName = exp.category?.name || 'Uncategorized';
    categoryComparison[categoryName] = (categoryComparison[categoryName] || 0) + parseFloat(exp.amount);
  });
  
  // Find biggest changes
  const categoryChanges = Object.keys(categorySpending).map(category => {
    const current = categorySpending[category] || 0;
    const previous = categoryComparison[category] || 0;
    const change = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);
    
    return {
      category,
      current,
      previous,
      change,
      difference: current - previous
    };
  });
  
  // Sort by absolute change
  categoryChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  
  // Calculate daily averages
  const daysInPeriod = period === '1month' ? 30 : period === '3months' ? 90 : period === '6months' ? 180 : 365;
  const dailyAverage = currentTotal / daysInPeriod;
  
  // Find spending patterns
  const dayOfWeekSpending = {};
  const monthlySpending = {};
  
  currentExpenses.forEach(exp => {
    const date = new Date(exp.date);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    
    dayOfWeekSpending[dayOfWeek] = (dayOfWeekSpending[dayOfWeek] || 0) + parseFloat(exp.amount);
    monthlySpending[month] = (monthlySpending[month] || 0) + parseFloat(exp.amount);
  });
  
  // Find highest spending day and month
  const highestSpendingDay = Object.entries(dayOfWeekSpending)
    .sort(([,a], [,b]) => b - a)[0];
  const highestSpendingMonth = Object.entries(monthlySpending)
    .sort(([,a], [,b]) => b - a)[0];
  
  // Calculate streaks and patterns
  const expenseDates = currentExpenses.map(exp => exp.date).sort();
  const spendingStreak = calculateSpendingStreak(expenseDates);
  
  return {
    overview: {
      totalSpending: currentTotal,
      previousPeriodSpending: compareTotal,
      percentageChange,
      dailyAverage,
      transactionCount: currentExpenses.length,
      averageTransactionAmount: currentTotal / currentExpenses.length || 0
    },
    categoryInsights: {
      topCategories: categoryChanges.slice(0, 5),
      biggestIncrease: categoryChanges.find(c => c.change > 0),
      biggestDecrease: categoryChanges.find(c => c.change < 0),
      categoryDistribution: categorySpending
    },
    patterns: {
      highestSpendingDay: highestSpendingDay ? {
        day: highestSpendingDay[0],
        amount: highestSpendingDay[1]
      } : null,
      highestSpendingMonth: highestSpendingMonth ? {
        month: highestSpendingMonth[0],
        amount: highestSpendingMonth[1]
      } : null,
      dayOfWeekSpending,
      monthlySpending,
      spendingStreak
    },
    alerts: generateAlerts(currentExpenses, compareExpenses, categoryChanges)
  };
}

// Helper function to process trend data
function processTrendData(trendData, categoryTrends, groupBy) {
  const processedData = {
    overall: [],
    byType: { expense: [], income: [] },
    byCategory: {}
  };
  
  // Process overall trends
  const periodMap = {};
  trendData.forEach(item => {
    const period = item.dataValues.period;
    const type = item.dataValues.type;
    const total = parseFloat(item.dataValues.total);
    const count = parseInt(item.dataValues.count);
    const average = parseFloat(item.dataValues.average);
    
    if (!periodMap[period]) {
      periodMap[period] = { period, expense: 0, income: 0, expenseCount: 0, incomeCount: 0 };
    }
    
    periodMap[period][type] = total;
    periodMap[period][`${type}Count`] = count;
    periodMap[period][`${type}Average`] = average;
  });
  
  processedData.overall = Object.values(periodMap).sort((a, b) => 
    new Date(a.period) - new Date(b.period)
  );
  
  // Process category trends
  const categoryMap = {};
  categoryTrends.forEach(item => {
    const period = item.dataValues.period;
    const categoryName = item.category?.name || 'Uncategorized';
    const total = parseFloat(item.dataValues.total);
    
    if (!categoryMap[categoryName]) {
      categoryMap[categoryName] = [];
    }
    
    categoryMap[categoryName].push({
      period,
      amount: total,
      category: categoryName,
      color: item.category?.color,
      icon: item.category?.icon
    });
  });
  
  // Sort category trends by period
  Object.keys(categoryMap).forEach(category => {
    categoryMap[category].sort((a, b) => new Date(a.period) - new Date(b.period));
  });
  
  processedData.byCategory = categoryMap;
  
  return processedData;
}

// Helper function to generate recommendations
async function generateRecommendations(userId, user) {
  const recommendations = [];
  
  // Get recent spending data
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentExpenses = await Expense.findAll({
    where: {
      userId,
      type: 'expense',
      date: { [Op.gte]: thirtyDaysAgo }
    },
    include: [{ model: Category, as: 'category' }]
  });
  
  const totalSpent = recentExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const monthlyBudget = parseFloat(user.monthlyBudget) || 0;
  
  // Budget recommendations
  if (monthlyBudget > 0) {
    const budgetUsage = (totalSpent / monthlyBudget) * 100;
    
    if (budgetUsage > 90) {
      recommendations.push({
        type: 'warning',
        category: 'budget',
        title: 'Budget Alert',
        message: `You've used ${budgetUsage.toFixed(1)}% of your monthly budget. Consider reducing spending in high-expense categories.`,
        priority: 'high',
        actionable: true,
        actions: ['Review recent expenses', 'Set category limits', 'Find cost-saving opportunities']
      });
    } else if (budgetUsage > 75) {
      recommendations.push({
        type: 'info',
        category: 'budget',
        title: 'Budget Tracking',
        message: `You've used ${budgetUsage.toFixed(1)}% of your monthly budget. You're on track but keep monitoring.`,
        priority: 'medium',
        actionable: true,
        actions: ['Monitor daily spending', 'Plan remaining budget']
      });
    }
  }
  
  // Category-based recommendations
  const categorySpending = {};
  recentExpenses.forEach(exp => {
    const categoryName = exp.category?.name || 'Uncategorized';
    categorySpending[categoryName] = (categorySpending[categoryName] || 0) + parseFloat(exp.amount);
  });
  
  const sortedCategories = Object.entries(categorySpending)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);
  
  if (sortedCategories.length > 0) {
    const topCategory = sortedCategories[0];
    const percentage = ((topCategory[1] / totalSpent) * 100).toFixed(1);
    
    recommendations.push({
      type: 'insight',
      category: 'spending',
      title: 'Top Spending Category',
      message: `${topCategory[0]} accounts for ${percentage}% of your spending this month (${topCategory[1].toFixed(2)}).`,
      priority: 'medium',
      actionable: true,
      actions: ['Review transactions in this category', 'Set category budget', 'Find alternatives']
    });
  }
  
  // Frequency-based recommendations
  const frequentExpenses = {};
  recentExpenses.forEach(exp => {
    const key = `${exp.description.toLowerCase()}-${exp.amount}`;
    frequentExpenses[key] = (frequentExpenses[key] || 0) + 1;
  });
  
  const recurringExpenses = Object.entries(frequentExpenses)
    .filter(([, count]) => count >= 3)
    .sort(([,a], [,b]) => b - a);
  
  if (recurringExpenses.length > 0) {
    recommendations.push({
      type: 'suggestion',
      category: 'automation',
      title: 'Recurring Expenses Detected',
      message: `You have ${recurringExpenses.length} potentially recurring expenses. Consider setting up automatic tracking.`,
      priority: 'low',
      actionable: true,
      actions: ['Set up recurring transactions', 'Create budget alerts', 'Automate categorization']
    });
  }
  
  // Savings recommendations
  if (monthlyBudget > totalSpent) {
    const savings = monthlyBudget - totalSpent;
    recommendations.push({
      type: 'positive',
      category: 'savings',
      title: 'Great Job!',
      message: `You're under budget by ${savings.toFixed(2)}. Consider saving or investing this amount.`,
      priority: 'low',
      actionable: true,
      actions: ['Transfer to savings', 'Invest surplus', 'Plan for next month']
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// Helper function to calculate spending streak
function calculateSpendingStreak(expenseDates) {
  if (expenseDates.length === 0) return { current: 0, longest: 0 };
  
  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;
  
  for (let i = 1; i < expenseDates.length; i++) {
    const prevDate = new Date(expenseDates[i - 1]);
    const currDate = new Date(expenseDates[i]);
    const dayDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
    
    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak);
  
  // Calculate current streak from today backwards
  const today = new Date();
  const lastExpenseDate = new Date(expenseDates[expenseDates.length - 1]);
  const daysSinceLastExpense = Math.floor((today - lastExpenseDate) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastExpense <= 1) {
    // Count backwards to find current streak
    for (let i = expenseDates.length - 1; i > 0; i--) {
      const prevDate = new Date(expenseDates[i - 1]);
      const currDate = new Date(expenseDates[i]);
      const dayDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }
  
  return { current: currentStreak, longest: longestStreak };
}

// Helper function to generate alerts
function generateAlerts(currentExpenses, compareExpenses, categoryChanges) {
  const alerts = [];
  
  // High spending alert
  const currentTotal = currentExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const compareTotal = compareExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  
  if (currentTotal > compareTotal * 1.5 && compareTotal > 0) {
    const percentageIncrease = (((currentTotal - compareTotal) / compareTotal) * 100).toFixed(1);
    alerts.push({
      type: 'warning',
      title: 'High Spending Alert',
      message: `Your spending has increased by ${percentageIncrease}% compared to the previous period.`,
      severity: 'high'
    });
  } else if (currentTotal > 0 && compareTotal === 0) {
    alerts.push({
      type: 'warning',
      title: 'New Spending Alert',
      message: `You have spending of $${currentTotal.toFixed(2)} this period, compared to no spending in the previous period.`,
      severity: 'medium'
    });
  }
  
  // Category spike alerts
  categoryChanges.forEach(category => {
    if (category.change > 100 && category.current > 100 && !isNaN(category.change) && isFinite(category.change)) {
      alerts.push({
        type: 'info',
        title: `${category.category} Spending Spike`,
        message: `Your ${category.category} spending has increased by ${category.change.toFixed(1)}%.`,
        severity: 'medium'
      });
    }
  });
  
  // Unusual transaction patterns
  const amounts = currentExpenses.map(exp => parseFloat(exp.amount));
  const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
  const unusualTransactions = amounts.filter(amt => amt > avgAmount * 3);
  
  if (unusualTransactions.length > 0) {
    alerts.push({
      type: 'info',
      title: 'Unusual Transactions Detected',
      message: `${unusualTransactions.length} transactions are significantly higher than your average.`,
      severity: 'low'
    });
  }
  
  return alerts;
}

module.exports = {
  getSpendingInsights,
  getSpendingTrends,
  getRecommendations
};