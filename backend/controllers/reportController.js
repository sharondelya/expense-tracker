const Expense = require('../models/Expense');
const Category = require('../models/Category');
const User = require('../models/User');
const { Op, fn, col, literal } = require('sequelize');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const reportController = {
  // Get comprehensive report data
  async getReports(req, res) {
    try {
      const { period = 'month', year, month, quarter, startDate, endDate } = req.query;
      const userId = req.user.id;

      // Calculate date range based on period
      let dateRange = {};
      const currentYear = parseInt(year) || new Date().getFullYear();
      const currentMonth = parseInt(month) || new Date().getMonth() + 1;

      switch (period) {
        case 'month':
          dateRange = {
            [Op.gte]: new Date(currentYear, currentMonth - 1, 1),
            [Op.lt]: new Date(currentYear, currentMonth, 1)
          };
          break;
        case 'quarter':
          const quarterNum = parseInt(quarter) || Math.ceil(currentMonth / 3);
          const quarterStart = (quarterNum - 1) * 3;
          dateRange = {
            [Op.gte]: new Date(currentYear, quarterStart, 1),
            [Op.lt]: new Date(currentYear, quarterStart + 3, 1)
          };
          break;
        case 'year':
          dateRange = {
            [Op.gte]: new Date(currentYear, 0, 1),
            [Op.lt]: new Date(currentYear + 1, 0, 1)
          };
          break;
        case 'custom':
          if (startDate && endDate) {
            dateRange = {
              [Op.gte]: new Date(startDate),
              [Op.lte]: new Date(endDate)
            };
          }
          break;
      }

      // Get all transactions for the period
      const transactions = await Expense.findAll({
        where: {
          userId,
          date: dateRange
        },
        include: [{
          model: Category,
          as: 'category',
          attributes: ['name', 'color', 'icon', 'monthlyBudget']
        }],
        order: [['date', 'DESC']]
      });

      // Calculate summary statistics
      const summary = {
        totalIncome: 0,
        totalExpenses: 0,
        transactionCount: transactions.length,
        averageTransaction: 0
      };

      transactions.forEach(transaction => {
        if (transaction.type === 'income') {
          summary.totalIncome += parseFloat(transaction.amount);
        } else {
          summary.totalExpenses += parseFloat(transaction.amount);
        }
      });

      summary.averageTransaction = transactions.length > 0 
        ? (summary.totalIncome + summary.totalExpenses) / transactions.length 
        : 0;

      // Generate trends data
      const trends = await generateTrendsData(transactions, period, currentYear, currentMonth);

      // Category breakdown
      const categoryBreakdown = await generateCategoryBreakdown(transactions);

      // Top transactions (largest 10)
      const topTransactions = transactions
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
        .slice(0, 10)
        .map(transaction => ({
          id: transaction.id,
          description: transaction.description,
          amount: parseFloat(transaction.amount),
          type: transaction.type,
          date: transaction.date,
          categoryName: transaction.category?.name || 'Uncategorized'
        }));

      // Budget analysis
      const budgetAnalysis = await generateBudgetAnalysis(userId, categoryBreakdown, currentYear, currentMonth);

      res.json({
        summary,
        trends,
        categoryBreakdown,
        topTransactions,
        budgetAnalysis,
        period: {
          type: period,
          year: currentYear,
          month: currentMonth,
          quarter: quarter || Math.ceil(currentMonth / 3)
        }
      });

    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  },

  // Export report in various formats
  async exportReport(req, res) {
    try {
      console.log('🚀 EXPORT REPORT FUNCTION CALLED');
      console.log('Request query:', JSON.stringify(req.query, null, 2));
      console.log('User from middleware:', req.user?.id);

      const { format = 'pdf', period = 'month', year, month } = req.query;
      const userId = req.user.id;

      console.log('Export parameters:', { format, period, year, month, userId });

      // Get report data (reuse the logic from getReports)
      console.log('📊 Getting report data...');
      const reportData = await reportController.getReportDataForExport(userId, { period, year, month });
      console.log('📊 Report data retrieved, expense count:', reportData.expenses?.length || 0);

      switch (format.toLowerCase()) {
        case 'pdf':
          console.log('📄 Exporting to PDF...');
          await reportController.exportToPDF(res, reportData);
          break;
        case 'excel':
        case 'xlsx':
          console.log('📊 Exporting to Excel...');
          await reportController.exportToExcel(res, reportData);
          break;
        case 'csv':
          console.log('📄 Exporting to CSV...');
          await reportController.exportToCSV(res, reportData);
          break;
        default:
          console.log('❌ Unsupported format:', format);
          res.status(400).json({ error: 'Unsupported export format' });
      }

    } catch (error) {
      console.error('❌ Error exporting report:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to export report', details: error.message });
    }
  },

  // Helper method to get report data for export
  async getReportDataForExport(userId, params) {
    const { period, year, month } = params;
    
    // Calculate date range (same logic as getReports)
    let dateRange = {};
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;

    switch (period) {
      case 'month':
        dateRange = {
          [Op.gte]: new Date(currentYear, currentMonth - 1, 1),
          [Op.lt]: new Date(currentYear, currentMonth, 1)
        };
        break;
      case 'year':
        dateRange = {
          [Op.gte]: new Date(currentYear, 0, 1),
          [Op.lt]: new Date(currentYear + 1, 0, 1)
        };
        break;
    }

    const transactions = await Expense.findAll({
      where: {
        userId,
        date: dateRange
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name', 'color', 'icon']
      }],
      order: [['date', 'DESC']]
    });

    const summary = {
      totalIncome: 0,
      totalExpenses: 0,
      transactionCount: transactions.length
    };

    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        summary.totalIncome += parseFloat(transaction.amount);
      } else {
        summary.totalExpenses += parseFloat(transaction.amount);
      }
    });

    const categoryBreakdown = await generateCategoryBreakdown(transactions);

    return {
      summary,
      transactions,
      categoryBreakdown,
      period: { type: period, year: currentYear, month: currentMonth }
    };
  },

  // Export to PDF
  async exportToPDF(res, reportData) {
    try {
      console.log('📄 Starting PDF generation...');
      const doc = new PDFDocument({ margin: 50 });
      
      // Set response headers before piping
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="financial-report.pdf"');
      
      console.log('📄 Piping PDF to response...');
      doc.pipe(res);

      console.log('📄 Adding content to PDF...');
      
      // Title and header
      doc.fontSize(24).text('Financial Report', { align: 'center' });
      doc.moveDown();
      
      const periodText = `Period: ${reportData.period.type} ${reportData.period.year}${reportData.period.month ? `-${reportData.period.month.toString().padStart(2, '0')}` : ''}`;
      doc.fontSize(14).text(periodText, { align: 'center' });
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
      
      doc.moveDown(2);

      // Summary section
      doc.fontSize(18).text('Summary', { underline: true });
      doc.moveDown();
      
      doc.fontSize(12)
         .text(`Total Income: $${reportData.summary.totalIncome.toFixed(2)}`)
         .text(`Total Expenses: $${reportData.summary.totalExpenses.toFixed(2)}`)
         .text(`Net Amount: $${(reportData.summary.totalIncome - reportData.summary.totalExpenses).toFixed(2)}`)
         .text(`Total Transactions: ${reportData.summary.transactionCount}`);

      doc.moveDown(2);

    // Category Breakdown
    doc.fontSize(18).text('Category Breakdown', { underline: true });
    doc.moveDown();

    if (reportData.categoryBreakdown && reportData.categoryBreakdown.length > 0) {
      reportData.categoryBreakdown.forEach(category => {
        doc.fontSize(12).text(`• ${category.name}: $${category.amount.toFixed(2)} (${category.transactionCount} transactions)`);
      });
    } else {
      doc.fontSize(12).text('No category data available');
    }

    doc.moveDown(2);

    // Transactions section
    doc.fontSize(18).text('Transactions', { underline: true });
    doc.moveDown();

    if (reportData.transactions && reportData.transactions.length > 0) {
      doc.fontSize(12).text(`Showing ${Math.min(reportData.transactions.length, 50)} of ${reportData.transactions.length} transactions:`);
      doc.moveDown();
      
      reportData.transactions.slice(0, 50).forEach((transaction, index) => {
        const sign = transaction.type === 'income' ? '+' : '-';
        const categoryName = transaction.category?.name || 'Uncategorized';
        const dateStr = new Date(transaction.date).toLocaleDateString();
        
        doc.fontSize(10).text(
          `${dateStr} | ${transaction.description} | ${categoryName} | ${sign}$${parseFloat(transaction.amount).toFixed(2)}`
        );
        
        // Add page break if needed
        if (doc.y > 700) {
          doc.addPage();
        }
      });
    } else {
      doc.fontSize(12).text('No transactions found for this period');
    }

    console.log('📄 Finalizing PDF...');
    doc.end();
    console.log('📄 PDF generation completed successfully');
    
    } catch (error) {
      console.error('📄 Error generating PDF:', error);
      console.error('Error stack:', error.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
      }
    }
  },

  // Export to Excel
  async exportToExcel(res, reportData) {
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Financial Report Summary']);
    summarySheet.addRow([]);
    summarySheet.addRow(['Total Income', reportData.summary.totalIncome]);
    summarySheet.addRow(['Total Expenses', reportData.summary.totalExpenses]);
    summarySheet.addRow(['Net Amount', reportData.summary.totalIncome - reportData.summary.totalExpenses]);
    summarySheet.addRow(['Total Transactions', reportData.summary.transactionCount]);

    // Transactions sheet
    const transactionsSheet = workbook.addWorksheet('Transactions');
    transactionsSheet.addRow(['Date', 'Description', 'Category', 'Type', 'Amount']);
    
    reportData.transactions.forEach(transaction => {
      transactionsSheet.addRow([
        new Date(transaction.date).toLocaleDateString(),
        transaction.description,
        transaction.category?.name || 'Uncategorized',
        transaction.type,
        parseFloat(transaction.amount)
      ]);
    });

    // Category breakdown sheet
    const categorySheet = workbook.addWorksheet('Categories');
    categorySheet.addRow(['Category', 'Amount', 'Transaction Count']);
    
    reportData.categoryBreakdown.forEach(category => {
      categorySheet.addRow([category.name, category.amount, category.transactionCount]);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="financial-report.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  },

  // Export to CSV
  async exportToCSV(res, reportData) {
    let csv = 'Date,Description,Category,Type,Amount\n';
    
    reportData.transactions.forEach(transaction => {
      csv += `${new Date(transaction.date).toLocaleDateString()},"${transaction.description}","${transaction.category?.name || 'Uncategorized'}",${transaction.type},${parseFloat(transaction.amount)}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="financial-report.csv"');
    res.send(csv);
  }
};

// Helper functions
async function generateTrendsData(transactions, period, year, month) {
  const trends = [];
  
  if (period === 'year') {
    // Monthly trends for the year
    for (let m = 1; m <= 12; m++) {
      const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() + 1 === m;
      });

      const monthData = {
        period: new Date(year, m - 1).toLocaleDateString('en-US', { month: 'short' }),
        income: 0,
        expenses: 0
      };

      monthTransactions.forEach(t => {
        if (t.type === 'income') {
          monthData.income += parseFloat(t.amount);
        } else {
          monthData.expenses += parseFloat(t.amount);
        }
      });

      trends.push(monthData);
    }
  } else if (period === 'month') {
    // Daily trends for the month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getDate() === day;
      });

      const dayData = {
        period: day.toString(),
        income: 0,
        expenses: 0
      };

      dayTransactions.forEach(t => {
        if (t.type === 'income') {
          dayData.income += parseFloat(t.amount);
        } else {
          dayData.expenses += parseFloat(t.amount);
        }
      });

      trends.push(dayData);
    }
  }

  return trends;
}

async function generateCategoryBreakdown(transactions) {
  const categoryMap = new Map();

  transactions.forEach(transaction => {
    if (transaction.type === 'expense') {
      const categoryName = transaction.category?.name || 'Uncategorized';
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          amount: 0,
          transactionCount: 0
        });
      }

      const category = categoryMap.get(categoryName);
      category.amount += parseFloat(transaction.amount);
      category.transactionCount += 1;
    }
  });

  return Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);
}

async function generateBudgetAnalysis(userId, categoryBreakdown, year, month) {
  try {
    const categories = await Category.findAll({
      where: { userId },
      attributes: ['name', 'monthlyBudget']
    });

    const budgetAnalysis = [];

    categories.forEach(category => {
      if (category.monthlyBudget && category.monthlyBudget > 0) {
        const spent = categoryBreakdown.find(cb => cb.name === category.name);
        const spentAmount = spent ? spent.amount : 0;
        const budgetUsage = (spentAmount / category.monthlyBudget) * 100;

        budgetAnalysis.push({
          categoryName: category.name,
          budget: category.monthlyBudget,
          spent: spentAmount,
          remaining: Math.max(0, category.monthlyBudget - spentAmount),
          usagePercentage: budgetUsage,
          status: budgetUsage > 100 ? 'over' : budgetUsage > 80 ? 'warning' : 'good'
        });
      }
    });

    return budgetAnalysis.sort((a, b) => b.usagePercentage - a.usagePercentage);
  } catch (error) {
    console.error('Error generating budget analysis:', error);
    return [];
  }
}

module.exports = reportController;