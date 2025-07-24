const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Verify transporter configuration
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready to send emails');
    } catch (error) {
      console.error('Email service configuration error:', error.message);
    }
  }

  // Format currency with proper commas and decimals
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: `"Expense Tracker" <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  // Budget Alert Email
  async sendBudgetAlert(userEmail, userName, category, spent, budget, percentage) {
    const subject = `🚨 Budget Alert: ${category} spending at ${percentage}%`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .alert-box { background: #fee; border-left: 4px solid #f56565; padding: 15px; margin: 20px 0; }
          .stats { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .progress-bar { background: #e2e8f0; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
          .progress-fill { background: ${percentage >= 100 ? '#f56565' : percentage >= 80 ? '#ed8936' : '#48bb78'}; height: 100%; width: ${Math.min(percentage, 100)}%; transition: width 0.3s ease; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Expense Tracker Alert</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            
            <div class="alert-box">
              <strong>⚠️ Budget Alert:</strong> Your spending in the <strong>${category}</strong> category has reached <strong>${percentage}%</strong> of your budget.
            </div>
            
            <div class="stats">
              <h3>📊 Spending Summary</h3>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Amount Spent:</strong> $${spent.toFixed(2)}</p>
              <p><strong>Budget Limit:</strong> $${budget.toFixed(2)}</p>
              <p><strong>Remaining:</strong> $${(budget - spent).toFixed(2)}</p>
              
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
              <p style="text-align: center; margin: 5px 0;"><strong>${percentage}% of budget used</strong></p>
            </div>
            
            <p>💡 <strong>Tip:</strong> Consider reviewing your recent expenses in this category to stay within your budget.</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from your Expense Tracker app.</p>
            <p>You can manage your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  // Weekly Report Email
  async sendWeeklyReport(userEmail, userName, reportData) {
    const { totalExpenses, totalIncome, netAmount, topCategories, weekRange } = reportData;
    
    const subject = `📈 Weekly Financial Report - ${weekRange}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
          .summary-card { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .amount { font-size: 24px; font-weight: bold; margin: 5px 0; }
          .positive { color: #48bb78; }
          .negative { color: #f56565; }
          .neutral { color: #667eea; }
          .category-item { background: white; padding: 10px; margin: 5px 0; border-radius: 6px; display: flex; justify-content: space-between; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Weekly Financial Report</h1>
            <p>${weekRange}</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            
            <p>Here's your weekly financial summary:</p>
            
            <div class="summary-grid">
              <div class="summary-card">
                <div>💸 Total Expenses</div>
                <div class="amount negative">$${this.formatCurrency(totalExpenses)}</div>
              </div>
              <div class="summary-card">
                <div>💰 Total Income</div>
                <div class="amount positive">$${this.formatCurrency(totalIncome)}</div>
              </div>
              <div class="summary-card">
                <div>📈 Net Amount</div>
                <div class="amount ${netAmount >= 0 ? 'positive' : 'negative'}">$${this.formatCurrency(netAmount)}</div>
              </div>
            </div>
            
            <h3>🏆 Top Spending Categories</h3>
            <div>
              ${topCategories.map(cat => `
                <div class="category-item">
                  <span>${cat.name}</span>
                  <strong>$${this.formatCurrency(cat.amount)}</strong>
                </div>
              `).join('')}
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/analytics" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Detailed Analytics</a>
            </div>
          </div>
          <div class="footer">
            <p>This is your automated weekly report from Expense Tracker.</p>
            <p>You can manage your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  // Monthly Report Email
  async sendMonthlyReport(userEmail, userName, reportData) {
    const { totalExpenses, totalIncome, netAmount, monthlyGoal, goalProgress, topCategories, monthName } = reportData;
    
    const subject = `📅 Monthly Financial Report - ${monthName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
          .summary-card { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .amount { font-size: 24px; font-weight: bold; margin: 5px 0; }
          .positive { color: #48bb78; }
          .negative { color: #f56565; }
          .neutral { color: #667eea; }
          .progress-bar { background: #e2e8f0; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
          .progress-fill { background: ${goalProgress >= 100 ? '#48bb78' : '#ed8936'}; height: 100%; width: ${Math.min(goalProgress, 100)}%; transition: width 0.3s ease; }
          .category-item { background: white; padding: 10px; margin: 5px 0; border-radius: 6px; display: flex; justify-content: space-between; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Monthly Financial Report</h1>
            <p>${monthName}</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            
            <p>Here's your monthly financial summary:</p>
            
            <div class="summary-grid">
              <div class="summary-card">
                <div>💸 Total Expenses</div>
                <div class="amount negative">$${this.formatCurrency(totalExpenses)}</div>
              </div>
              <div class="summary-card">
                <div>💰 Total Income</div>
                <div class="amount positive">$${this.formatCurrency(totalIncome)}</div>
              </div>
              <div class="summary-card">
                <div>📈 Net Amount</div>
                <div class="amount ${netAmount >= 0 ? 'positive' : 'negative'}">$${this.formatCurrency(netAmount)}</div>
              </div>
            </div>
            
            ${monthlyGoal ? `
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h3>🎯 Monthly Savings Goal</h3>
                <p><strong>Goal:</strong> $${this.formatCurrency(monthlyGoal)}</p>
                <p><strong>Progress:</strong> $${this.formatCurrency(netAmount)} (${goalProgress.toFixed(1)}%)</p>
                <div class="progress-bar">
                  <div class="progress-fill"></div>
                </div>
                <p style="text-align: center; margin: 5px 0;"><strong>${goalProgress >= 100 ? '🎉 Goal Achieved!' : `${goalProgress.toFixed(1)}% of goal reached`}</strong></p>
              </div>
            ` : ''}
            
            <h3>🏆 Top Spending Categories</h3>
            <div>
              ${topCategories.map(cat => `
                <div class="category-item">
                  <span>${cat.name}</span>
                  <strong>$${this.formatCurrency(cat.amount)}</strong>
                </div>
              `).join('')}
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/analytics" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Detailed Analytics</a>
            </div>
          </div>
          <div class="footer">
            <p>This is your automated monthly report from Expense Tracker.</p>
            <p>You can manage your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  // Welcome Email
  async sendWelcomeEmail(userEmail, userName) {
    const subject = '🎉 Welcome to Expense Tracker!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .feature-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature-item { margin: 10px 0; padding: 10px; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Expense Tracker!</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            
            <p>Welcome to your personal expense tracking journey! We're excited to help you take control of your finances.</p>
            
            <div class="feature-list">
              <h3>🚀 What you can do:</h3>
              <div class="feature-item">📊 <strong>Track Expenses:</strong> Log and categorize your daily expenses</div>
              <div class="feature-item">💰 <strong>Set Budgets:</strong> Create budgets and get alerts when you're close to limits</div>
              <div class="feature-item">📈 <strong>View Analytics:</strong> Get insights with beautiful charts and reports</div>
              <div class="feature-item">📧 <strong>Email Reports:</strong> Receive weekly and monthly financial summaries</div>
              <div class="feature-item">🌙 <strong>Dark Mode:</strong> Switch between light and dark themes</div>
              <div class="feature-item">📱 <strong>Responsive Design:</strong> Access from any device</div>
            </div>
            
            <p>💡 <strong>Pro Tip:</strong> Start by setting up your expense categories and monthly budgets for better tracking!</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a>
            </div>
          </div>
          <div class="footer">
            <p>Happy tracking! 💪</p>
            <p>The Expense Tracker Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  // Split Notification Email
  async sendSplitNotification(participantEmail, participantName, payerName, expenseDescription, amount, currency = 'USD') {
    const subject = `💸 You've been added to a split expense: ${expenseDescription}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .split-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .amount-highlight { font-size: 24px; font-weight: bold; color: #667eea; text-align: center; margin: 15px 0; }
          .action-buttons { text-align: center; margin: 20px 0; }
          .btn { display: inline-block; padding: 12px 24px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .btn-primary { background: #667eea; color: white; }
          .btn-secondary { background: #e2e8f0; color: #4a5568; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💸 Split Expense Notification</h1>
          </div>
          <div class="content">
            <h2>Hello ${participantName}!</h2>
            
            <p><strong>${payerName}</strong> has added you to a split expense and you owe:</p>
            
            <div class="amount-highlight">
              ${currency} ${amount.toFixed(2)}
            </div>
            
            <div class="split-info">
              <h3>📋 Expense Details</h3>
              <p><strong>Description:</strong> ${expenseDescription}</p>
              <p><strong>Paid by:</strong> ${payerName}</p>
              <p><strong>Your share:</strong> ${currency} ${amount.toFixed(2)}</p>
            </div>
            
            <p>💡 You can accept this split and mark it as paid when you settle up with ${payerName}.</p>
            
            <div class="action-buttons">
              <a href="${process.env.FRONTEND_URL}/splits" class="btn btn-primary">View Split Details</a>
            </div>
            
            <p><small>💳 <strong>Payment Options:</strong> You can settle this expense directly with ${payerName} through cash, bank transfer, or any preferred payment method.</small></p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Expense Tracker.</p>
            <p>If you have any questions, please contact ${payerName} directly.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(participantEmail, subject, html);
  }

  // Split Payment Notification Email
  async sendSplitPaymentNotification(payerEmail, payerName, participantName, expenseDescription, amount, currency = 'USD') {
    const subject = `✅ Split payment received: ${expenseDescription}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .payment-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #48bb78; }
          .amount-highlight { font-size: 24px; font-weight: bold; color: #48bb78; text-align: center; margin: 15px 0; }
          .success-icon { text-align: center; font-size: 48px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Received</h1>
          </div>
          <div class="content">
            <div class="success-icon">🎉</div>
            
            <h2>Great news, ${payerName}!</h2>
            
            <p><strong>${participantName}</strong> has marked their split payment as paid:</p>
            
            <div class="amount-highlight">
              ${currency} ${amount.toFixed(2)}
            </div>
            
            <div class="payment-info">
              <h3>📋 Payment Details</h3>
              <p><strong>Expense:</strong> ${expenseDescription}</p>
              <p><strong>Paid by:</strong> ${participantName}</p>
              <p><strong>Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
              <p><strong>Status:</strong> ✅ Paid</p>
            </div>
            
            <p>🎊 This split has been settled! The payment status has been updated in your expense tracker.</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/splits" style="background: #48bb78; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View All Splits</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Expense Tracker.</p>
            <p>Thank you for using our split expense feature!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(payerEmail, subject, html);
  }
}

module.exports = new EmailService();