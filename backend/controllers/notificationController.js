const emailService = require('../utils/emailService');
const { User, Expense, Category } = require('../models');
const { Op } = require('sequelize');

class NotificationController {
  // Send welcome email when user registers
  async sendWelcomeEmail(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const result = await emailService.sendWelcomeEmail(
        user.email,
        `${user.firstName} ${user.lastName}`
      );

      return result;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Check and send budget alerts
  async checkBudgetAlerts(userId) {
    try {
      console.log('💰 Checking budget alerts for user:', userId);
      
      const user = await User.findByPk(userId);
      if (!user || !user.emailAlerts || !user.budgetAlerts) {
        console.log('⚠️ User not found or budget alerts disabled for:', user?.email || userId);
        return { success: false, message: 'User not found or budget alerts disabled' };
      }

      console.log(`✅ User found: ${user.email}, checking budget...`);

      // Get current month's expenses
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const expenses = await Expense.findAll({
        where: {
          userId,
          date: {
            [Op.between]: [startOfMonth, endOfMonth]
          }
        },
        include: [{ model: Category, as: 'category' }]
      });

      const totalSpent = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
      const monthlyBudget = parseFloat(user.monthlyBudget || 0);

      console.log(`💰 Monthly spending: $${totalSpent}, Budget: $${monthlyBudget}`);

      if (monthlyBudget > 0) {
        const percentage = (totalSpent / monthlyBudget) * 100;
        console.log(`📊 Budget usage: ${percentage.toFixed(1)}%`);

        // Send alert if spending is at 80% or 100% of budget
        if (percentage >= 80) {
          console.log('🚨 Budget threshold reached, sending alert email...');
          
          const alertResult = await emailService.sendBudgetAlert(
            user.email,
            `${user.firstName} ${user.lastName}`,
            'Monthly Budget',
            totalSpent,
            monthlyBudget,
            Math.round(percentage)
          );
          
          console.log('📧 Budget alert email result:', alertResult);
          
          return { 
            success: true, 
            alert: {
              totalSpent,
              monthlyBudget,
              percentage: Math.round(percentage),
              emailSent: alertResult.success
            }
          };
        } else {
          console.log('✅ Budget usage under 80%, no alert needed');
          return { success: true, message: 'Budget usage is under threshold' };
        }
      } else {
        console.log('⚠️ No monthly budget set for user');
        return { success: false, message: 'No monthly budget set' };
      }
    } catch (error) {
      console.error('❌ Error checking budget alerts:', error);
      return { success: false, error: error.message };
    }
  }

  // Send weekly report
  async sendWeeklyReport(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Check if user has weekly reports enabled
      if (!user.emailAlerts || !user.weeklyReports) {
        return { success: false, message: 'Weekly reports are disabled for this user' };
      }

      // Get last 7 days data (from 7 days ago to now)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      const expenses = await Expense.findAll({
        where: {
          userId,
          date: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [{
          model: Category,
          as: 'category',
          required: false // Allow expenses without categories
        }],
        order: [['date', 'DESC']]
      });

      // Calculate totals
      const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
      const totalIncome = 0; // Assuming we'll add income tracking later
      const netAmount = totalIncome - totalExpenses;

      // Get top categories
      const categoryTotals = {};
      expenses.forEach(expense => {
        const categoryName = expense.category?.name || 'Uncategorized';
        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = 0;
        }
        categoryTotals[categoryName] += parseFloat(expense.amount || 0);
      });

      const topCategories = Object.entries(categoryTotals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Format date range nicely
      const weekRange = `${startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })} - ${endDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`;

      const reportData = {
        totalExpenses,
        totalIncome,
        netAmount,
        topCategories,
        weekRange,
        expenseCount: expenses.length
      };

      console.log('Sending weekly report for user:', user.email, 'with data:', reportData);

      const result = await emailService.sendWeeklyReport(
        user.email,
        `${user.firstName} ${user.lastName}`,
        reportData
      );

      return result;
    } catch (error) {
      console.error('Error sending weekly report:', error);
      return { success: false, error: error.message };
    }
  }

  // Send monthly report
  async sendMonthlyReport(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Check if user has monthly reports enabled
      if (!user.emailAlerts || !user.monthlyReports) {
        return { success: false, message: 'Monthly reports are disabled for this user' };
      }

      // Get current month data
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const expenses = await Expense.findAll({
        where: {
          userId,
          date: {
            [Op.between]: [startOfMonth, endOfMonth]
          }
        },
        include: [{
          model: Category,
          as: 'category',
          required: false // Allow expenses without categories
        }],
        order: [['date', 'DESC']]
      });

      // Calculate totals
      const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
      const totalIncome = 0; // Assuming we'll add income tracking later
      const netAmount = totalIncome - totalExpenses;

      // Get top categories
      const categoryTotals = {};
      expenses.forEach(expense => {
        const categoryName = expense.category?.name || 'Uncategorized';
        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = 0;
        }
        categoryTotals[categoryName] += parseFloat(expense.amount || 0);
      });

      const topCategories = Object.entries(categoryTotals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const monthlyGoal = user.monthlyGoal ? parseFloat(user.monthlyGoal) : null;
      const goalProgress = monthlyGoal ? (Math.abs(netAmount) / monthlyGoal) * 100 : 0;

      const reportData = {
        totalExpenses,
        totalIncome,
        netAmount,
        monthlyGoal,
        goalProgress,
        topCategories,
        monthName,
        expenseCount: expenses.length
      };

      console.log('Sending monthly report for user:', user.email, 'with data:', reportData);

      const result = await emailService.sendMonthlyReport(
        user.email,
        `${user.firstName} ${user.lastName}`,
        reportData
      );

      return result;
    } catch (error) {
      console.error('Error sending monthly report:', error);
      return { success: false, error: error.message };
    }
  }

  // Send test email directly (for scheduler use)
  async sendTestEmail(subject, message, userEmail = null) {
    try {
      console.log('📧 Test email function called');
      
      let email = userEmail;
      
      // If no email provided, use the first active user for testing
      if (!email) {
        const user = await User.findOne({ where: { isActive: true } });
        if (!user) {
          console.log('❌ No active users found for test email');
          return { success: false, error: 'No active users found' };
        }
        email = user.email;
        console.log('✅ Using user email for test:', email);
      }

      console.log('📧 Sending test email to:', email);

      const result = await emailService.sendEmail(
        email,
        subject,
        message
      );

      console.log('📧 Email service result:', result);

      if (result.success) {
        console.log('✅ Test email sent successfully');
        return { success: true, messageId: result.messageId };
      } else {
        console.log('❌ Failed to send test email:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      return { success: false, error: error.message };
    }
  }

  // Test email functionality
  async testEmail(req, res) {
    try {
      console.log('📧 Test email function called');
      console.log('User ID:', req.user?.id);
      
      const userId = req.user.id;
      const user = await User.findByPk(userId);
      
      if (!user) {
        console.log('❌ User not found:', userId);
        return res.status(404).json({ message: 'User not found' });
      }

      console.log('✅ User found:', user.email);
      console.log('📧 Sending test email...');

      const result = await emailService.sendEmail(
        user.email,
        '🧪 Test Email from Expense Tracker',
        `
        <h2>Test Email Successful! 🎉</h2>
        <p>Hello ${user.firstName}!</p>
        <p>This is a test email to confirm that your email notifications are working properly.</p>
        <p>You should now receive:</p>
        <ul>
          <li>Budget alerts when you're close to your limits</li>
          <li>Weekly financial reports</li>
          <li>Monthly financial summaries</li>
        </ul>
        <p>Happy tracking! 💰</p>
        `
      );

      console.log('📧 Email service result:', result);

      if (result.success) {
        console.log('✅ Test email sent successfully');
        res.json({ message: 'Test email sent successfully!', messageId: result.messageId });
      } else {
        console.log('❌ Failed to send test email:', result.error);
        res.status(500).json({ message: 'Failed to send test email', error: result.error });
      }
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Manual trigger for weekly report
  async triggerWeeklyReport(req, res) {
    try {
      console.log('📧 Weekly report function called');
      const userId = req.user.id;
      console.log('User ID:', userId);
      
      const result = await this.sendWeeklyReport(userId);
      
      if (result.success) {
        console.log('✅ Weekly report sent successfully');
        res.json({ message: 'Weekly report sent successfully!', messageId: result.messageId });
      } else {
        console.log('❌ Weekly report failed:', result.error);
        res.status(500).json({ message: 'Failed to send weekly report', error: result.error });
      }
    } catch (error) {
      console.error('Error triggering weekly report:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Manual trigger for monthly report
  async triggerMonthlyReport(req, res) {
    try {
      const userId = req.user.id;
      const result = await this.sendMonthlyReport(userId);
      
      if (result.success) {
        res.json({ message: 'Monthly report sent successfully!', messageId: result.messageId });
      } else {
        res.status(500).json({ message: 'Failed to send monthly report', error: result.error });
      }
    } catch (error) {
      console.error('Error triggering monthly report:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
}

const notificationController = new NotificationController();

// Bind methods to preserve 'this' context
notificationController.triggerWeeklyReport = notificationController.triggerWeeklyReport.bind(notificationController);
notificationController.triggerMonthlyReport = notificationController.triggerMonthlyReport.bind(notificationController);
notificationController.testEmail = notificationController.testEmail.bind(notificationController);

module.exports = notificationController;