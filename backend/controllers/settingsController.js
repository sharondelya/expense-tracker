const { Expense, User, Category, FinancialGoal, RecurringTransaction, SavingsTransaction } = require('../models');
const { Op } = require('sequelize');

// Convert currency for all user data
const convertCurrency = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fromCurrency, toCurrency, conversionRate } = req.body;

    if (!fromCurrency || !toCurrency || !conversionRate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: fromCurrency, toCurrency, conversionRate' 
      });
    }

    if (fromCurrency === toCurrency) {
      return res.status(400).json({ 
        success: false, 
        message: 'Source and target currencies cannot be the same' 
      });
    }

    const convertedCounts = {
      expenses: 0,
      goals: 0,
      recurring: 0,
      user: 0
    };

    console.log(`Converting currency for user ${userId} from ${fromCurrency} to ${toCurrency} at rate ${conversionRate}`);

    // 1. Convert all expenses and income
    const expenses = await Expense.findAll({
      where: { userId },
      attributes: ['id', 'amount']
    });

    for (const expense of expenses) {
      const convertedAmount = parseFloat(expense.amount) * conversionRate;
      // Ensure minimum value of 0.01 to meet validation requirements
      const newAmount = Math.max(0.01, Math.round(convertedAmount * 100) / 100).toFixed(2);
      await expense.update({ amount: newAmount });
      convertedCounts.expenses++;
    }

    console.log(`Converted ${convertedCounts.expenses} expense records`);

    // 2. Convert financial goals
    const goals = await FinancialGoal.findAll({
      where: { user_id: userId },
      attributes: ['id', 'target_amount', 'current_amount', 'auto_save_amount']
    });

    for (const goal of goals) {
      const updates = {};
      
      if (goal.target_amount) {
        const convertedTarget = parseFloat(goal.target_amount) * conversionRate;
        updates.target_amount = Math.max(0.01, Math.round(convertedTarget * 100) / 100).toFixed(2);
      }
      
      if (goal.current_amount) {
        const convertedCurrent = parseFloat(goal.current_amount) * conversionRate;
        updates.current_amount = Math.max(0.00, Math.round(convertedCurrent * 100) / 100).toFixed(2);
      }
      
      if (goal.auto_save_amount) {
        const convertedAutoSave = parseFloat(goal.auto_save_amount) * conversionRate;
        updates.auto_save_amount = Math.max(0.01, Math.round(convertedAutoSave * 100) / 100).toFixed(2);
      }
      
      await goal.update(updates);
      convertedCounts.goals++;
    }

    console.log(`Converted ${convertedCounts.goals} financial goals`);

    // 3. Convert savings transactions
    const savingsTransactions = await SavingsTransaction.findAll({
      where: { user_id: userId },
      attributes: ['id', 'amount']
    });

    for (const transaction of savingsTransactions) {
      const convertedAmount = parseFloat(transaction.amount) * conversionRate;
      const newAmount = Math.max(0.01, Math.round(convertedAmount * 100) / 100).toFixed(2);
      await transaction.update({ amount: newAmount });
    }

    console.log(`Converted ${savingsTransactions.length} savings transactions`);

    // 4. Convert recurring transactions
    const recurringTransactions = await RecurringTransaction.findAll({
      where: { userId },
      attributes: ['id', 'amount']
    });

    for (const recurring of recurringTransactions) {
      const convertedAmount = parseFloat(recurring.amount) * conversionRate;
      const newAmount = Math.max(0.01, Math.round(convertedAmount * 100) / 100).toFixed(2);
      await recurring.update({ amount: newAmount });
      convertedCounts.recurring++;
    }

    console.log(`Converted ${convertedCounts.recurring} recurring transactions`);

    // 5. Convert user budget amounts
    const user = await User.findByPk(userId);
    if (user && user.monthlyBudget && parseFloat(user.monthlyBudget) > 0) {
      const convertedBudget = parseFloat(user.monthlyBudget) * conversionRate;
      const newBudget = Math.max(0.01, Math.round(convertedBudget * 100) / 100).toFixed(2);
      await user.update({ monthlyBudget: newBudget });
      convertedCounts.user = 1;
    }

    console.log(`Converted user budget: ${convertedCounts.user > 0 ? 'Yes' : 'No'}`);

    // 6. Convert category budgets
    const categories = await Category.findAll({
      where: { 
        userId,
        monthlyBudget: { [Op.not]: null }
      },
      attributes: ['id', 'monthlyBudget']
    });

    let categoryCount = 0;
    for (const category of categories) {
      if (category.monthlyBudget && parseFloat(category.monthlyBudget) > 0) {
        const convertedBudget = parseFloat(category.monthlyBudget) * conversionRate;
        const newBudget = Math.max(0.01, Math.round(convertedBudget * 100) / 100).toFixed(2);
        await category.update({ monthlyBudget: newBudget });
        categoryCount++;
      }
    }

    console.log(`Converted ${categoryCount} category budgets`);

    res.json({
      success: true,
      message: `Successfully converted all amounts from ${fromCurrency} to ${toCurrency}`,
      conversionRate,
      convertedCounts: {
        ...convertedCounts,
        categories: categoryCount,
        savingsTransactions: savingsTransactions.length
      }
    });

  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert currency',
      error: error.message
    });
  }
};

module.exports = {
  convertCurrency
};
