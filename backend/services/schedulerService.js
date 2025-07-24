const cron = require('node-cron');
const { User, Expense, Category } = require('../models');
const { Op } = require('sequelize');
const notificationController = require('../controllers/notificationController');
const recurringTransactionController = require('../controllers/recurringTransactionController');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  // Start all scheduled tasks
  start() {
    if (this.isRunning) {
      console.log('📅 Scheduler is already running');
      return;
    }

    console.log('🚀 Starting Expense Tracker Scheduler...');
    this.isRunning = true;

    // 1. Daily Budget Alerts - Check every day at 9:00 AM
    const budgetAlertsJob = cron.schedule('0 9 * * *', () => {
      this.checkBudgetAlerts();
    }, {
      scheduled: false,
      timezone: "America/New_York"
    });

    // 2. Weekly Reports - Send every Sunday at 8:00 AM
    const weeklyReportsJob = cron.schedule('0 8 * * 0', () => {
      this.sendWeeklyReports();
    }, {
      scheduled: false,
      timezone: "America/New_York"
    });

    // 3. Monthly Reports - Send on 1st of each month at 9:00 AM
    const monthlyReportsJob = cron.schedule('0 9 1 * *', () => {
      this.sendMonthlyReports();
    }, {
      scheduled: false,
      timezone: "America/New_York"
    });

    // 4. Process Recurring Transactions - Daily at 6:00 AM
    const recurringTransactionsJob = cron.schedule('0 6 * * *', () => {
      this.processRecurringTransactions();
    }, {
      scheduled: false,
      timezone: "America/New_York"
    });

    // Store jobs for management
    this.jobs.set('budgetAlerts', budgetAlertsJob);
    this.jobs.set('weeklyReports', weeklyReportsJob);
    this.jobs.set('monthlyReports', monthlyReportsJob);
    this.jobs.set('recurringTransactions', recurringTransactionsJob);

    // Start all jobs
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`✅ Started ${name} scheduler`);
    });

    console.log('📅 All scheduled tasks are now running!');
    this.logNextExecution();
  }

  // Stop all scheduled tasks
  stop() {
    if (!this.isRunning) {
      console.log('📅 Scheduler is not running');
      return;
    }

    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Stopped ${name} scheduler`);
    });

    this.isRunning = false;
    console.log('📅 Scheduler stopped');
  }

  // Daily Budget Alerts Check
  async checkBudgetAlerts() {
    try {
      console.log('💰 Running daily budget alerts check...');
      
      // Get all users with budget alerts enabled
      const users = await User.findAll({
        where: {
          budgetAlerts: true,
          emailAlerts: true,
          isActive: true
        }
      });

      console.log(`Found ${users.length} users with budget alerts enabled`);

      for (const user of users) {
        try {
          await notificationController.checkBudgetAlerts(user.id);
          console.log(`✅ Checked budget alerts for user: ${user.email}`);
        } catch (error) {
          console.error(`❌ Error checking budget for user ${user.email}:`, error.message);
        }
      }

      console.log('💰 Daily budget alerts check completed');
    } catch (error) {
      console.error('❌ Error in daily budget alerts check:', error);
    }
  }

  // Weekly Reports Automation
  async sendWeeklyReports() {
    try {
      console.log('📊 Running weekly reports automation...');
      
      // Get all users with weekly reports enabled
      const users = await User.findAll({
        where: {
          weeklyReports: true,
          emailAlerts: true,
          isActive: true
        }
      });

      console.log(`Found ${users.length} users with weekly reports enabled`);

      for (const user of users) {
        try {
          const result = await notificationController.sendWeeklyReport(user.id);
          if (result.success) {
            console.log(`✅ Sent weekly report to: ${user.email}`);
          } else {
            console.log(`⚠️ Failed to send weekly report to ${user.email}: ${result.message}`);
          }
        } catch (error) {
          console.error(`❌ Error sending weekly report to ${user.email}:`, error.message);
        }
      }

      console.log('📊 Weekly reports automation completed');
    } catch (error) {
      console.error('❌ Error in weekly reports automation:', error);
    }
  }

  // Monthly Reports Automation
  async sendMonthlyReports() {
    try {
      console.log('📅 Running monthly reports automation...');
      
      // Get all users with monthly reports enabled
      const users = await User.findAll({
        where: {
          monthlyReports: true,
          emailAlerts: true,
          isActive: true
        }
      });

      console.log(`Found ${users.length} users with monthly reports enabled`);

      for (const user of users) {
        try {
          const result = await notificationController.sendMonthlyReport(user.id);
          if (result.success) {
            console.log(`✅ Sent monthly report to: ${user.email}`);
          } else {
            console.log(`⚠️ Failed to send monthly report to ${user.email}: ${result.message}`);
          }
        } catch (error) {
          console.error(`❌ Error sending monthly report to ${user.email}:`, error.message);
        }
      }

      console.log('📅 Monthly reports automation completed');
    } catch (error) {
      console.error('❌ Error in monthly reports automation:', error);
    }
  }

  // Process Recurring Transactions
  async processRecurringTransactions() {
    try {
      console.log('🔄 Processing recurring transactions...');
      
      // Create a mock request/response to call the controller function
      const mockReq = {};
      let processedCount = 0;
      const mockRes = {
        json: (data) => {
          processedCount = data.processedTransactions?.length || 0;
          console.log(`✅ Processed ${processedCount} recurring transactions`);
          return { success: true, processed: processedCount };
        },
        status: (code) => ({
          json: (data) => {
            console.log(`❌ Error processing recurring transactions:`, data);
            return { success: false, error: data.error };
          }
        })
      };
      
      // Call the controller function
      await recurringTransactionController.processDueRecurringTransactions(mockReq, mockRes);
      
      console.log('🔄 Recurring transactions processing completed');
      return processedCount;
    } catch (error) {
      console.error('❌ Error processing recurring transactions:', error);
      throw error;
    }
  }

  // Testing Methods (for immediate execution)
  async testBudgetAlerts() {
    console.log('🧪 Testing budget alerts (immediate execution)...');
    await this.checkBudgetAlerts();
  }

  async testWeeklyReports() {
    console.log('🧪 Testing weekly reports (immediate execution)...');
    await this.sendWeeklyReports();
  }

  async testMonthlyReports() {
    console.log('🧪 Testing monthly reports (immediate execution)...');
    await this.sendMonthlyReports();
  }

  async testRecurringTransactions() {
    console.log('🧪 Testing recurring transactions (immediate execution)...');
    try {
      const processedCount = await this.processRecurringTransactions();
      
      // Send a test email notification about the processing
      const testSubject = 'Recurring Transactions Test Results';
      const testMessage = `
        <h2>🔄 Recurring Transactions Test</h2>
        <p>The recurring transactions test has been completed successfully.</p>
        <ul>
          <li><strong>Processed Transactions:</strong> ${processedCount}</li>
          <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        ${processedCount > 0 
          ? '<p>✅ Recurring transactions were found and processed successfully.</p>'
          : '<p>ℹ️ No due recurring transactions were found at this time.</p>'
        }
        <p>This test verifies that the recurring transactions automation system is working correctly.</p>
      `;
      
      await notificationController.sendTestEmail(testSubject, testMessage);
      console.log('📧 Test email sent for recurring transactions');
      
    } catch (error) {
      console.error('❌ Error in recurring transactions test:', error);
      
      // Send error notification
      const errorSubject = 'Recurring Transactions Test Error';
      const errorMessage = `
        <h2>❌ Recurring Transactions Test Failed</h2>
        <p>There was an error during the recurring transactions test:</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${error.message}</pre>
        <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
      `;
      
      try {
        await notificationController.sendTestEmail(errorSubject, errorMessage);
      } catch (emailError) {
        console.error('❌ Failed to send error email:', emailError);
      }
    }
  }

  // Get status of all jobs
  getStatus() {
    const status = {
      isRunning: this.isRunning,
      jobs: {}
    };

    this.jobs.forEach((job, name) => {
      status.jobs[name] = {
        running: job.running || false,
        scheduled: job.scheduled || false
      };
    });

    return status;
  }

  // Log next execution times
  logNextExecution() {
    console.log('\n📅 Next Scheduled Executions:');
    console.log('  • Budget Alerts: Daily at 9:00 AM');
    console.log('  • Weekly Reports: Sundays at 8:00 AM');
    console.log('  • Monthly Reports: 1st of month at 9:00 AM');
    console.log('  • Recurring Transactions: Daily at 6:00 AM');
    console.log('');
  }
}

// Export singleton instance
module.exports = new SchedulerService();
