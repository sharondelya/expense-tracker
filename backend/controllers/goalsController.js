const { FinancialGoal, SavingsTransaction, User } = require('../config/associations');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Get all financial goals for a user
const getGoals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category } = req.query;

    const whereClause = { user_id: userId };
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;

    const goals = await FinancialGoal.findAll({
      where: whereClause,
      include: [
        {
          model: SavingsTransaction,
          as: 'transactions',
          attributes: ['id', 'amount', 'transaction_type', 'transaction_date', 'description', 'source']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Calculate progress for each goal
    const goalsWithProgress = goals.map(goal => {
      const goalData = goal.toJSON();
      const progress = (goalData.current_amount / goalData.target_amount) * 100;
      const daysRemaining = Math.ceil((new Date(goalData.target_date) - new Date()) / (1000 * 60 * 60 * 24));
      
      return {
        ...goalData,
        progress: Math.min(progress, 100),
        days_remaining: daysRemaining,
        is_overdue: daysRemaining < 0 && goalData.status === 'active'
      };
    });

    res.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
};

// Create a new financial goal
const createGoal = async (req, res) => {
  try {
    console.log('🚀 CREATE GOAL FUNCTION CALLED');
    console.log('Request body received:', JSON.stringify(req.body, null, 2));
    console.log('User from middleware:', req.user?.id);
    
    const userId = req.user.id;
    const {
      title,
      description,
      target_amount,
      target_date,
      category,
      priority,
      auto_save_amount,
      auto_save_frequency,
      reminder_enabled,
      reminder_frequency
    } = req.body;

    console.log('Extracted data:', {
      userId,
      title,
      description,
      target_amount,
      target_date,
      category,
      priority,
      auto_save_amount,
      auto_save_frequency,
      reminder_enabled,
      reminder_frequency
    });

    if (!title || !target_amount || !target_date) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({ error: 'Title, target amount, and target date are required' });
    }

    if (parseFloat(target_amount) <= 0) {
      console.log('❌ Validation failed: Invalid target amount');
      return res.status(400).json({ error: 'Target amount must be greater than 0' });
    }

    if (new Date(target_date) <= new Date()) {
      console.log('❌ Validation failed: Invalid target date');
      return res.status(400).json({ error: 'Target date must be in the future' });
    }

    console.log('✅ Validation passed, creating goal...');

    const goalData = {
      user_id: userId,
      title,
      description,
      target_amount: parseFloat(target_amount),
      target_date,
      category: category || 'other',
      priority: priority || 'medium',
      auto_save_amount: auto_save_amount ? parseFloat(auto_save_amount) : null,
      auto_save_frequency,
      reminder_enabled: reminder_enabled !== false,
      reminder_frequency: reminder_frequency || 'monthly'
    };

    console.log('Goal data to create:', goalData);

    const goal = await FinancialGoal.create(goalData);

    console.log('✅ Goal created successfully:', goal.toJSON());

    res.status(201).json({ goal });
  } catch (error) {
    console.error('❌ Error creating goal:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create goal', details: error.message });
  }
};

// Update a financial goal
const updateGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    const goal = await FinancialGoal.findOne({
      where: { id, user_id: userId }
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Validate target_amount if provided
    if (updateData.target_amount && parseFloat(updateData.target_amount) <= 0) {
      return res.status(400).json({ error: 'Target amount must be greater than 0' });
    }

    // Validate target_date if provided
    if (updateData.target_date && new Date(updateData.target_date) <= new Date()) {
      return res.status(400).json({ error: 'Target date must be in the future' });
    }

    await goal.update(updateData);
    
    const updatedGoal = await FinancialGoal.findByPk(id, {
      include: [
        {
          model: SavingsTransaction,
          as: 'transactions',
          attributes: ['id', 'amount', 'transaction_type', 'transaction_date', 'description', 'source']
        }
      ]
    });

    res.json({ goal: updatedGoal });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
};

// Delete a financial goal
const deleteGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const goal = await FinancialGoal.findOne({
      where: { id, user_id: userId }
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Delete associated savings transactions first
    await SavingsTransaction.destroy({
      where: { goal_id: id }
    });

    await goal.destroy();

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
};

// Add money to a goal (savings transaction)
const addSavings = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    console.log('🚀 ADD SAVINGS FUNCTION CALLED');
    console.log('Request params:', req.params);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User from middleware:', req.user?.id);

    const userId = req.user.id;
    const { goalId } = req.params;
    const { amount, description, source = 'manual' } = req.body;

    console.log('Extracted data:', { userId, goalId, amount, description, source });

    if (!amount || parseFloat(amount) <= 0) {
      console.log('❌ Validation failed: Invalid amount');
      await transaction.rollback();
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    console.log('✅ Amount validation passed');

    const goal = await FinancialGoal.findOne({
      where: { id: goalId, user_id: userId }
    });

    console.log('Goal found:', goal ? goal.toJSON() : 'null');

    if (!goal) {
      console.log('❌ Goal not found');
      await transaction.rollback();
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (goal.status !== 'active') {
      console.log('❌ Goal is not active:', goal.status);
      await transaction.rollback();
      return res.status(400).json({ error: 'Cannot add savings to inactive goal' });
    }

    console.log('✅ Goal validation passed, creating savings transaction...');

    // Create savings transaction
    const savingsTransaction = await SavingsTransaction.create({
      user_id: userId,
      goal_id: goalId,
      amount: parseFloat(amount),
      transaction_type: 'deposit',
      description,
      source,
      is_automatic: source !== 'manual'
    }, { transaction });

    // Update goal's current amount
    const newCurrentAmount = parseFloat(goal.current_amount) + parseFloat(amount);
    await goal.update({
      current_amount: newCurrentAmount,
      status: newCurrentAmount >= parseFloat(goal.target_amount) ? 'completed' : 'active'
    }, { transaction });

    await transaction.commit();

    // Fetch updated goal with transactions
    const updatedGoal = await FinancialGoal.findByPk(goalId, {
      include: [
        {
          model: SavingsTransaction,
          as: 'transactions',
          attributes: ['id', 'amount', 'transaction_type', 'transaction_date', 'description', 'source'],
          order: [['transaction_date', 'DESC']]
        }
      ]
    });

    res.json({ 
      goal: updatedGoal,
      transaction: savingsTransaction,
      message: newCurrentAmount >= parseFloat(goal.target_amount) ? 'Congratulations! Goal completed!' : 'Savings added successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error adding savings:', error);
    res.status(500).json({ error: 'Failed to add savings' });
  }
};

// Withdraw money from a goal
const withdrawSavings = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { goalId } = req.params;
    const { amount, description } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const goal = await FinancialGoal.findOne({
      where: { id: goalId, user_id: userId }
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (parseFloat(amount) > parseFloat(goal.current_amount)) {
      return res.status(400).json({ error: 'Withdrawal amount exceeds current savings' });
    }

    // Create withdrawal transaction
    const savingsTransaction = await SavingsTransaction.create({
      user_id: userId,
      goal_id: goalId,
      amount: parseFloat(amount),
      transaction_type: 'withdrawal',
      description,
      source: 'manual'
    }, { transaction });

    // Update goal's current amount
    const newCurrentAmount = parseFloat(goal.current_amount) - parseFloat(amount);
    await goal.update({
      current_amount: newCurrentAmount,
      status: goal.status === 'completed' && newCurrentAmount < parseFloat(goal.target_amount) ? 'active' : goal.status
    }, { transaction });

    await transaction.commit();

    // Fetch updated goal with transactions
    const updatedGoal = await FinancialGoal.findByPk(goalId, {
      include: [
        {
          model: SavingsTransaction,
          as: 'transactions',
          attributes: ['id', 'amount', 'transaction_type', 'transaction_date', 'description', 'source'],
          order: [['transaction_date', 'DESC']]
        }
      ]
    });

    res.json({ 
      goal: updatedGoal,
      transaction: savingsTransaction,
      message: 'Withdrawal completed successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error withdrawing savings:', error);
    res.status(500).json({ error: 'Failed to withdraw savings' });
  }
};

// Get savings statistics
const getSavingsStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await FinancialGoal.findAll({
      where: { user_id: userId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('target_amount')), 'total_target'],
        [sequelize.fn('SUM', sequelize.col('current_amount')), 'total_saved']
      ],
      group: ['status'],
      raw: true
    });

    // Get recent transactions
    const recentTransactions = await SavingsTransaction.findAll({
      where: { user_id: userId },
      include: [
        {
          model: FinancialGoal,
          as: 'goal',
          attributes: ['title', 'category']
        }
      ],
      order: [['transaction_date', 'DESC']],
      limit: 10
    });

    // Calculate monthly savings trend
    const monthlyTrend = await SavingsTransaction.findAll({
      where: {
        user_id: userId,
        transaction_type: 'deposit',
        transaction_date: {
          [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 12))
        }
      },
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('transaction_date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_saved']
      ],
      group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('transaction_date'))],
      order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('transaction_date')), 'ASC']],
      raw: true
    });

    res.json({
      stats,
      recent_transactions: recentTransactions,
      monthly_trend: monthlyTrend
    });
  } catch (error) {
    console.error('Error fetching savings stats:', error);
    res.status(500).json({ error: 'Failed to fetch savings statistics' });
  }
};

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addSavings,
  withdrawSavings,
  getSavingsStats
};