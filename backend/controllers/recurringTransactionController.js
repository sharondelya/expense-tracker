const { RecurringTransaction, Expense, User, Category } = require('../config/associations');
const { Op } = require('sequelize');

// Helper function to calculate next due date
const calculateNextDueDate = (frequency, currentDate, dayOfMonth = null, dayOfWeek = null, monthOfYear = null) => {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      if (dayOfWeek !== null) {
        // Adjust to specific day of week if provided
        const currentDay = nextDate.getDay();
        const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
        if (daysToAdd === 0) nextDate.setDate(nextDate.getDate() + 7);
        else nextDate.setDate(nextDate.getDate() + daysToAdd);
      }
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (dayOfMonth !== null) {
        nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      }
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      if (dayOfMonth !== null) {
        nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      }
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      if (monthOfYear !== null) {
        nextDate.setMonth(monthOfYear - 1);
      }
      if (dayOfMonth !== null) {
        nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      }
      break;
  }
  
  return nextDate;
};

// Get all recurring transactions for a user
const getRecurringTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, type, isActive } = req.query;
    
    const whereClause = { userId: userId };
    if (type) whereClause.type = type;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';
    
    const offset = (page - 1) * limit;
    
    const { count, rows } = await RecurringTransaction.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [{
        model: Category,
        as: 'category',
        required: false
      }]
    });
    
    res.json({
      recurringTransactions: rows,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching recurring transactions:', error);
    res.status(500).json({ error: 'Failed to fetch recurring transactions' });
  }
};

// Create a new recurring transaction
const createRecurringTransaction = async (req, res) => {
  try {
    console.log('🚀 CREATE RECURRING TRANSACTION FUNCTION CALLED');
    console.log('Request body received:', JSON.stringify(req.body, null, 2));
    console.log('User from middleware:', req.user?.id);
    
    const userId = req.user.id;
    const {
      type,
      amount,
      description,
      categoryId,
      frequency,
      startDate,
      endDate,
      totalOccurrences,
      dayOfMonth,
      dayOfWeek,
      monthOfYear,
      notes
    } = req.body;

    console.log('Creating recurring transaction with data:', {
      userId,
      type,
      amount,
      description,
      categoryId,
      frequency,
      startDate,
      endDate,
      totalOccurrences,
      dayOfMonth,
      dayOfWeek,
      monthOfYear,
      notes
    });

    // Validate required fields
    if (!type || !amount || !description || !frequency || !startDate) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate initial next due date - first occurrence should be on start date
    const start = new Date(startDate);
    let nextDueDate;
    
    // For the initial creation, the first due date should be the start date itself
    // Only calculate the next interval when processing due transactions
    if (frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly' || 
        frequency === 'quarterly' || frequency === 'yearly') {
      nextDueDate = new Date(start);
    } else {
      nextDueDate = calculateNextDueDate(frequency, start, dayOfMonth, dayOfWeek, monthOfYear);
    }

    console.log('Calculated nextDueDate:', nextDueDate);

    const recurringTransactionData = {
      userId,
      type,
      amount: parseFloat(amount),
      description,
      categoryId: categoryId ? parseInt(categoryId) : null,
      frequency,
      startDate: start,
      endDate: endDate ? new Date(endDate) : null,
      nextDueDate,
      totalOccurrences: totalOccurrences ? parseInt(totalOccurrences) : null,
      dayOfMonth: dayOfMonth ? parseInt(dayOfMonth) : null,
      dayOfWeek: dayOfWeek ? parseInt(dayOfWeek) : null,
      monthOfYear: monthOfYear ? parseInt(monthOfYear) : null,
      notes,
      isActive: true,
      currentOccurrences: 0
    };

    console.log('Creating with data:', recurringTransactionData);

    const recurringTransaction = await RecurringTransaction.create(recurringTransactionData);

    console.log('Created recurring transaction:', recurringTransaction.toJSON());

    res.status(201).json(recurringTransaction);
  } catch (error) {
    console.error('Error creating recurring transaction:', error);
    res.status(500).json({ error: 'Failed to create recurring transaction' });
  }
};

// Update a recurring transaction
const updateRecurringTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    const recurringTransaction = await RecurringTransaction.findOne({
      where: { id, userId }
    });

    if (!recurringTransaction) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    // If frequency or timing parameters change, recalculate next due date
    if (updateData.frequency || updateData.dayOfMonth || updateData.dayOfWeek || updateData.monthOfYear) {
      const frequency = updateData.frequency || recurringTransaction.frequency;
      const dayOfMonth = updateData.dayOfMonth !== undefined ? updateData.dayOfMonth : recurringTransaction.dayOfMonth;
      const dayOfWeek = updateData.dayOfWeek !== undefined ? updateData.dayOfWeek : recurringTransaction.dayOfWeek;
      const monthOfYear = updateData.monthOfYear !== undefined ? updateData.monthOfYear : recurringTransaction.monthOfYear;
      
      updateData.nextDueDate = calculateNextDueDate(
        frequency,
        recurringTransaction.nextDueDate,
        dayOfMonth,
        dayOfWeek,
        monthOfYear
      );
    }

    await recurringTransaction.update(updateData);
    res.json(recurringTransaction);
  } catch (error) {
    console.error('Error updating recurring transaction:', error);
    res.status(500).json({ error: 'Failed to update recurring transaction' });
  }
};

// Delete a recurring transaction
const deleteRecurringTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const recurringTransaction = await RecurringTransaction.findOne({
      where: { id, userId }
    });

    if (!recurringTransaction) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    await recurringTransaction.destroy();
    res.json({ message: 'Recurring transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting recurring transaction:', error);
    res.status(500).json({ error: 'Failed to delete recurring transaction' });
  }
};

// Process due recurring transactions (this would typically be called by a cron job)
const processDueRecurringTransactions = async (req, res) => {
  try {
    const now = new Date();
    
    // Find all active recurring transactions that are due
    const dueTransactions = await RecurringTransaction.findAll({
      where: {
        isActive: true,
        nextDueDate: {
          [Op.lte]: now
        }
      },
      include: [{
        model: User,
        as: 'user'
      }]
    });

    const processedTransactions = [];

    for (const recurring of dueTransactions) {
      try {
        // Check if we've reached the total occurrences limit
        if (recurring.totalOccurrences && recurring.currentOccurrences >= recurring.totalOccurrences) {
          await recurring.update({ isActive: false });
          continue;
        }

        // Check if we've passed the end date
        if (recurring.endDate && now > recurring.endDate) {
          await recurring.update({ isActive: false });
          continue;
        }

        // Create the actual expense/income transaction
        const expense = await Expense.create({
          userId: recurring.userId,
          type: recurring.type,
          amount: recurring.amount,
          description: `${recurring.description} (Recurring)`,
          categoryId: recurring.categoryId,
          date: now
        });

        // Calculate next due date
        const nextDueDate = calculateNextDueDate(
          recurring.frequency,
          recurring.nextDueDate,
          recurring.dayOfMonth,
          recurring.dayOfWeek,
          recurring.monthOfYear
        );

        // Update the recurring transaction
        await recurring.update({
          nextDueDate,
          lastProcessed: now,
          currentOccurrences: recurring.currentOccurrences + 1
        });

        processedTransactions.push({
          recurringId: recurring.id,
          transactionId: expense.id,
          description: recurring.description,
          amount: recurring.amount,
          type: recurring.type,
          nextDueDate
        });

      } catch (error) {
        console.error(`Error processing recurring transaction ${recurring.id}:`, error);
      }
    }

    res.json({
      message: `Processed ${processedTransactions.length} recurring transactions`,
      processedTransactions
    });
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
    res.status(500).json({ error: 'Failed to process recurring transactions' });
  }
};

// Get upcoming recurring transactions
const getUpcomingRecurringTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    
    const upcomingTransactions = await RecurringTransaction.findAll({
      where: {
        userId,
        isActive: true,
        nextDueDate: {
          [Op.lte]: futureDate
        }
      },
      order: [['nextDueDate', 'ASC']],
      limit: 10
    });
    
    res.json(upcomingTransactions);
  } catch (error) {
    console.error('Error fetching upcoming recurring transactions:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming recurring transactions' });
  }
};

module.exports = {
  getRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  processDueRecurringTransactions,
  getUpcomingRecurringTransactions
};