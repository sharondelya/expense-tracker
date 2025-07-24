const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const Category = require('../models/Category');
const Expense = require('../models/Expense');
const RecurringTransaction = require('../models/RecurringTransaction');
const FinancialGoal = require('../models/FinancialGoal');
const SplitGroup = require('../models/SplitGroup');
const ExpenseSplit = require('../models/ExpenseSplit');
const SavingsTransaction = require('../models/SavingsTransaction');
const notificationController = require('./notificationController');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d',
  });
};

const createDefaultCategories = async (userId) => {
  const defaultCategories = [
    { name: 'Food & Dining', icon: 'utensils', color: '#EF4444' },
    { name: 'Transportation', icon: 'car', color: '#3B82F6' },
    { name: 'Shopping', icon: 'shopping-bag', color: '#8B5CF6' },
    { name: 'Entertainment', icon: 'film', color: '#F59E0B' },
    { name: 'Bills & Utilities', icon: 'receipt', color: '#10B981' },
    { name: 'Healthcare', icon: 'heart', color: '#EF4444' },
    { name: 'Education', icon: 'book', color: '#6366F1' },
    { name: 'Travel', icon: 'plane', color: '#14B8A6' },
  ];

  for (const category of defaultCategories) {
    await Category.create({ ...category, userId });
  }
};

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  currency: Joi.string().length(3).default('USD'),
  monthlyBudget: Joi.number().min(0).default(0),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

exports.register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const existingUser = await User.findOne({ where: { email: value.email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create(value);
    await createDefaultCategories(user.id);

    // Send welcome email (don't wait for it to complete)
    notificationController.sendWelcomeEmail(user.id).catch(error => {
      console.error('Failed to send welcome email:', error);
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const user = await User.findOne({ where: { email: value.email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await user.validatePassword(value.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login time
    await user.updateLastLogin();

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    console.log('🔧 Profile update request received:', req.body);
    
    const updateSchema = Joi.object({
      firstName: Joi.string().min(2).max(50),
      lastName: Joi.string().min(2).max(50),
      email: Joi.string().email(),
      currency: Joi.string().length(3),
      monthlyBudget: Joi.number().min(0),
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      console.log('❌ Validation error:', error.details[0].message);
      return res.status(400).json({ message: error.details[0].message });
    }

    console.log('✅ Validated data:', value);

    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('📊 Current user monthlyBudget:', user.monthlyBudget);
    console.log('📊 New monthlyBudget:', value.monthlyBudget);

    // Check if email is being updated and if it's already taken
    if (value.email && value.email !== user.email) {
      const existingUser = await User.findOne({ where: { email: value.email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
    }

    await user.update(value);
    console.log('✅ User updated successfully');
    
    // Get the updated user data to verify the change
    const updatedUser = await User.findByPk(req.userId);
    console.log('📊 Updated user monthlyBudget:', updatedUser.monthlyBudget);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteAllUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`Starting data deletion for user: ${user.email}`);

    // Delete all user data in the correct order (respecting foreign key constraints)
    const deletionResults = {
      savingsTransactions: 0,
      expenseSplits: 0,
      splitGroups: 0,
      expenses: 0,
      recurringTransactions: 0,
      financialGoals: 0,
      categories: 0
    };

    // Delete savings transactions
    const savingsCount = await SavingsTransaction.destroy({ where: { user_id: userId } });
    deletionResults.savingsTransactions = savingsCount;

    // Delete expense splits
    const expenseSplitsCount = await ExpenseSplit.destroy({ where: { payer_id: userId } });
    deletionResults.expenseSplits = expenseSplitsCount;

    // Delete split groups
    const splitGroupsCount = await SplitGroup.destroy({ where: { creator_id: userId } });
    deletionResults.splitGroups = splitGroupsCount;

    // Delete expenses
    const expensesCount = await Expense.destroy({ where: { userId } });
    deletionResults.expenses = expensesCount;

    // Delete recurring transactions
    const recurringCount = await RecurringTransaction.destroy({ where: { userId } });
    deletionResults.recurringTransactions = recurringCount;

    // Delete financial goals
    const goalsCount = await FinancialGoal.destroy({ where: { user_id: userId } });
    deletionResults.financialGoals = goalsCount;

    // Delete categories (keep default ones, delete custom ones)
    const categoriesCount = await Category.destroy({ where: { userId } });
    deletionResults.categories = categoriesCount;

    // Recreate default categories
    await createDefaultCategories(userId);

    // Reset user preferences and data
    await user.update({
      monthlyBudget: 0,
      monthlyGoal: 0,
      budgets: {},
      preferences: {
        defaultCategory: null,
        autoCategories: true,
        showTips: true,
      },
      profilePicture: null
    });

    console.log('Data deletion completed:', deletionResults);

    res.json({
      message: 'All user data has been successfully deleted',
      deletionSummary: {
        ...deletionResults,
        totalRecordsDeleted: Object.values(deletionResults).reduce((sum, count) => sum + count, 0)
      }
    });

  } catch (error) {
    console.error('Delete all data error:', error);
    res.status(500).json({
      message: 'Failed to delete user data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const changePasswordSchema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(6).required(),
    });

    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await user.validatePassword(value.currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash and update new password
    await user.update({ password: value.newPassword });

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    console.log('🖼️ Upload profile picture endpoint called');
    console.log('User ID:', req.user?.id);
    console.log('File received:', !!req.file);
    console.log('File details:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    // Convert buffer to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    console.log('✅ Image converted to base64, length:', base64Image.length);

    // Update user's profile picture in database
    await user.update({ profilePicture: base64Image });
    console.log('✅ Profile picture updated in database');

    // Get updated user data
    const updatedUser = await User.findByPk(userId);

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: base64Image,
      user: updatedUser
    });
    
    console.log('✅ Profile picture upload completed successfully');
  } catch (error) {
    console.error('❌ Profile picture upload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};