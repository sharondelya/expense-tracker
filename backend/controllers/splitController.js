const { ExpenseSplit, SplitGroup, Expense, User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const emailService = require('../utils/emailService');

// Create a new expense split
const createExpenseSplit = async (req, res) => {
  try {
    const { expenseId, participants, splitType = 'equal', notes } = req.body;
    const payerId = req.user.id;

    // Validate expense exists and belongs to user
    const expense = await Expense.findOne({
      where: { id: expenseId, user_id: payerId }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Validate participants
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'At least one participant is required' });
    }

    const totalAmount = parseFloat(expense.amount);
    let splits = [];

    // Calculate split amounts based on type
    if (splitType === 'equal') {
      const splitAmount = totalAmount / (participants.length + 1); // +1 for payer
      
      // Add payer's split
      splits.push({
        expense_id: expenseId,
        payer_id: payerId,
        participant_email: req.user.email,
        participant_name: `${req.user.firstName} ${req.user.lastName}`,
        amount: splitAmount,
        split_type: splitType,
        status: 'paid', // Payer has already paid
        notes
      });

      // Add participants' splits
      for (const participant of participants) {
        splits.push({
          expense_id: expenseId,
          payer_id: payerId,
          participant_email: participant.email,
          participant_name: participant.name,
          amount: splitAmount,
          split_type: splitType,
          status: 'pending',
          notes
        });
      }
    } else if (splitType === 'percentage') {
      let totalPercentage = 0;
      
      // Validate percentages
      for (const participant of participants) {
        if (!participant.percentage || participant.percentage <= 0) {
          return res.status(400).json({ error: 'Invalid percentage for participant' });
        }
        totalPercentage += participant.percentage;
      }

      if (totalPercentage > 100) {
        return res.status(400).json({ error: 'Total percentage cannot exceed 100%' });
      }

      // Calculate payer's percentage (remaining)
      const payerPercentage = 100 - totalPercentage;
      const payerAmount = (totalAmount * payerPercentage) / 100;

      splits.push({
        expense_id: expenseId,
        payer_id: payerId,
        participant_email: req.user.email,
        participant_name: `${req.user.firstName} ${req.user.lastName}`,
        amount: payerAmount,
        percentage: payerPercentage,
        split_type: splitType,
        status: 'paid',
        notes
      });

      // Add participants' splits
      for (const participant of participants) {
        const amount = (totalAmount * participant.percentage) / 100;
        splits.push({
          expense_id: expenseId,
          payer_id: payerId,
          participant_email: participant.email,
          participant_name: participant.name,
          amount: amount,
          percentage: participant.percentage,
          split_type: splitType,
          status: 'pending',
          notes
        });
      }
    } else if (splitType === 'amount') {
      let totalSplitAmount = 0;
      
      // Validate amounts
      for (const participant of participants) {
        if (!participant.amount || participant.amount <= 0) {
          return res.status(400).json({ error: 'Invalid amount for participant' });
        }
        totalSplitAmount += participant.amount;
      }

      if (totalSplitAmount > totalAmount) {
        return res.status(400).json({ error: 'Split amounts cannot exceed total expense amount' });
      }

      // Calculate payer's amount (remaining)
      const payerAmount = totalAmount - totalSplitAmount;

      splits.push({
        expense_id: expenseId,
        payer_id: payerId,
        participant_email: req.user.email,
        participant_name: `${req.user.firstName} ${req.user.lastName}`,
        amount: payerAmount,
        split_type: splitType,
        status: 'paid',
        notes
      });

      // Add participants' splits
      for (const participant of participants) {
        splits.push({
          expense_id: expenseId,
          payer_id: payerId,
          participant_email: participant.email,
          participant_name: participant.name,
          amount: participant.amount,
          split_type: splitType,
          status: 'pending',
          notes
        });
      }
    }

    // Create all splits
    const createdSplits = await ExpenseSplit.bulkCreate(splits);

    // Send email notifications to participants
    for (const participant of participants) {
      const participantSplit = createdSplits.find(split => 
        split.participant_email === participant.email
      );
      
      if (participantSplit) {
        try {
          await emailService.sendSplitNotification(
            participant.email,
            participant.name,
            `${req.user.firstName} ${req.user.lastName}`,
            expense.description,
            participantSplit.amount,
            'USD'
          );
        } catch (emailError) {
          console.error('Failed to send split notification email:', emailError);
        }
      }
    }

    res.status(201).json({
      message: 'Expense split created successfully',
      splits: createdSplits
    });
  } catch (error) {
    console.error('Error creating expense split:', error);
    res.status(500).json({ error: 'Failed to create expense split' });
  }
};

// Get splits for an expense
const getExpenseSplits = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user.id;

    // Verify expense belongs to user
    const expense = await Expense.findOne({
      where: { id: expenseId, user_id: userId }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const splits = await ExpenseSplit.findAll({
      where: { expense_id: expenseId },
      order: [['created_at', 'ASC']]
    });

    res.json(splits);
  } catch (error) {
    console.error('Error fetching expense splits:', error);
    res.status(500).json({ error: 'Failed to fetch expense splits' });
  }
};

// Get all splits where user is involved (as payer or participant)
const getUserSplits = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { status, page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      [Op.or]: [
        { payer_id: userId },
        { participant_email: userEmail }
      ]
    };

    if (status) {
      whereClause.status = status;
    }

    const { count, rows: splits } = await ExpenseSplit.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Expense,
          attributes: ['id', 'description', 'amount', 'date']
        },
        {
          model: User,
          as: 'payer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      splits,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user splits:', error);
    res.status(500).json({ error: 'Failed to fetch splits' });
  }
};

// Update split status
const updateSplitStatus = async (req, res) => {
  try {
    const { splitId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    const validStatuses = ['pending', 'accepted', 'paid', 'declined'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const split = await ExpenseSplit.findOne({
      where: {
        id: splitId,
        [Op.or]: [
          { payer_id: userId },
          { participant_email: userEmail }
        ]
      },
      include: [
        {
          model: Expense,
          attributes: ['description', 'amount']
        },
        {
          model: User,
          as: 'payer',
          attributes: ['firstName', 'lastName', 'email']
        }
      ]
    });

    if (!split) {
      return res.status(404).json({ error: 'Split not found' });
    }

    // Update status and settled_at if paid
    const updateData = { status };
    if (status === 'paid') {
      updateData.settled_at = new Date();
    }

    await split.update(updateData);

    // Send notification to payer if status changed to paid
    if (status === 'paid' && split.payer_id !== userId) {
      try {
        await emailService.sendSplitPaymentNotification(
          split.payer.email,
          `${split.payer.firstName} ${split.payer.lastName}`,
          split.participant_name,
          split.Expense.description,
          split.amount,
          'USD'
        );
      } catch (emailError) {
        console.error('Failed to send payment notification email:', emailError);
      }
    }

    res.json({
      message: 'Split status updated successfully',
      split
    });
  } catch (error) {
    console.error('Error updating split status:', error);
    res.status(500).json({ error: 'Failed to update split status' });
  }
};

// Create a split group
const createSplitGroup = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const creatorId = req.user.id;

    if (!name || !members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Name and members are required' });
    }

    // Add creator to members if not already included
    const creatorMember = {
      email: req.user.email,
      name: `${req.user.firstName} ${req.user.lastName}`,
      id: creatorId
    };

    const allMembers = [creatorMember, ...members.filter(m => m.email !== req.user.email)];

    const splitGroup = await SplitGroup.create({
      name,
      description,
      creator_id: creatorId,
      members: allMembers
    });

    res.status(201).json({
      message: 'Split group created successfully',
      group: splitGroup
    });
  } catch (error) {
    console.error('Error creating split group:', error);
    res.status(500).json({ error: 'Failed to create split group' });
  }
};

// Get user's split groups
const getUserSplitGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // For now, just get groups where user is creator to avoid JSON query issues
    // TODO: Implement proper JSON search once database schema is updated
    const groups = await SplitGroup.findAll({
      where: {
        creator_id: userId,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(groups);
  } catch (error) {
    console.error('Error fetching split groups:', error);
    res.status(500).json({ error: 'Failed to fetch split groups' });
  }
};

// Get split summary/balance for user
const getSplitSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Get amounts user owes to others
    const owedSplits = await ExpenseSplit.findAll({
      where: {
        participant_email: userEmail,
        payer_id: { [Op.ne]: userId },
        status: { [Op.in]: ['pending', 'accepted'] }
      },
      include: [
        {
          model: User,
          as: 'payer',
          attributes: ['firstName', 'lastName', 'email']
        },
        {
          model: Expense,
          attributes: ['description']
        }
      ]
    });

    // Get amounts others owe to user
    const owingToUserSplits = await ExpenseSplit.findAll({
      where: {
        payer_id: userId,
        participant_email: { [Op.ne]: userEmail },
        status: { [Op.in]: ['pending', 'accepted'] }
      },
      include: [
        {
          model: Expense,
          attributes: ['description']
        }
      ]
    });

    // Calculate totals
    const totalOwed = owedSplits.reduce((sum, split) => sum + parseFloat(split.amount), 0);
    const totalOwing = owingToUserSplits.reduce((sum, split) => sum + parseFloat(split.amount), 0);
    const netBalance = totalOwing - totalOwed;

    res.json({
      totalOwed,
      totalOwing,
      netBalance,
      owedSplits,
      owingToUserSplits
    });
  } catch (error) {
    console.error('Error fetching split summary:', error);
    res.status(500).json({ error: 'Failed to fetch split summary' });
  }
};

// Update a split group
const updateSplitGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, members } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'At least one member is required' });
    }

    // Find the group and verify ownership
    const group = await SplitGroup.findOne({
      where: { id: groupId, creator_id: userId }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Update the group
    await group.update({
      name: name.trim(),
      description: description?.trim() || '',
      members: members.map(member => ({
        name: member.name?.trim(),
        email: member.email?.toLowerCase().trim()
      }))
    });

    res.json({
      message: 'Group updated successfully',
      group
    });
  } catch (error) {
    console.error('Error updating split group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
};

// Delete a split group
const deleteSplitGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Find the group and verify ownership
    const group = await SplitGroup.findOne({
      where: { id: groupId, creator_id: userId }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if group has any active splits
    const activeSplits = await ExpenseSplit.findOne({
      where: { 
        group_id: groupId,
        status: { [Op.in]: ['pending', 'accepted'] }
      }
    });

    if (activeSplits) {
      return res.status(409).json({ 
        error: 'Cannot delete group with active splits. Please resolve all splits first.' 
      });
    }

    // Delete the group
    await group.destroy();

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting split group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

module.exports = {
  createExpenseSplit,
  getExpenseSplits,
  getUserSplits,
  updateSplitStatus,
  createSplitGroup,
  getUserSplitGroups,
  updateSplitGroup,
  deleteSplitGroup,
  getSplitSummary
};