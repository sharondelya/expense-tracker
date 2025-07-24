const Joi = require('joi');
const { Op } = require('sequelize');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

const expenseSchema = Joi.object({
  amount: Joi.number().positive().required(),
  description: Joi.string().min(1).max(255).required(),
  notes: Joi.string().allow(''),
  date: Joi.date().iso().required(),
  type: Joi.string().valid('expense', 'income').default('expense'),
  paymentMethod: Joi.string().valid('cash', 'card', 'bank_transfer', 'digital_wallet', 'other').default('card'),
  categoryId: Joi.any().required(),
  isRecurring: Joi.boolean().default(false),
  recurringFrequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').allow(null),
  tags: Joi.array().items(Joi.string()).default([]),
});

exports.createExpense = async (req, res) => {
  try {
    console.log('Received expense data:', req.body);
    const { error, value } = expenseSchema.validate(req.body);
    if (error) {
      console.log('Validation error:', error.details[0].message);
      console.log('Failed validation for:', req.body);
      return res.status(400).json({ message: error.details[0].message });
    }

    // Verify category belongs to user
    const categoryId = typeof value.categoryId === 'string' && !isNaN(value.categoryId) 
      ? parseInt(value.categoryId) 
      : value.categoryId;
    
    const category = await Category.findOne({
      where: {
        id: categoryId,
        [Op.or]: [
          { userId: req.userId },
          { isDefault: true }
        ]
      }
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const expense = await Expense.create({
      ...value,
      categoryId: categoryId,
      userId: req.userId,
    });

    const expenseWithCategory = await Expense.findByPk(expense.id, {
      include: [{ model: Category, as: 'category' }]
    });

    res.status(201).json({
      message: 'Expense created successfully',
      expense: expenseWithCategory,
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const where = { userId: req.userId };

    // Filters
    if (req.query.type) {
      where.type = req.query.type;
    }

    if (req.query.categoryId) {
      where.categoryId = req.query.categoryId;
    }

    if (req.query.startDate && req.query.endDate) {
      where.date = {
        [Op.between]: [req.query.startDate, req.query.endDate]
      };
    }

    if (req.query.search) {
      where[Op.or] = [
        { description: { [Op.iLike]: `%${req.query.search}%` } },
        { notes: { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    // Amount filters
    if (req.query.minAmount || req.query.maxAmount) {
      where.amount = {};
      if (req.query.minAmount) {
        where.amount[Op.gte] = parseFloat(req.query.minAmount);
      }
      if (req.query.maxAmount) {
        where.amount[Op.lte] = parseFloat(req.query.maxAmount);
      }
    }

    // Sorting
    let orderBy = [['date', 'DESC'], ['created_at', 'DESC']]; // Default sorting
    if (req.query.sortBy) {
      const sortBy = req.query.sortBy;
      const sortOrder = req.query.sortOrder || 'DESC';
      
      // Validate sort fields
      const validSortFields = ['date', 'amount', 'description', 'created_at'];
      if (validSortFields.includes(sortBy)) {
        orderBy = [[sortBy, sortOrder.toUpperCase()]];
        // Add secondary sort by created_at if not already sorting by it
        if (sortBy !== 'created_at') {
          orderBy.push(['created_at', 'DESC']);
        }
      }
    }

    const { count, rows } = await Expense.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category' }],
      order: orderBy,
      limit,
      offset,
    });

    res.json({
      expenses: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      where: { id: req.params.id, userId: req.userId },
      include: [{ model: Category, as: 'category' }],
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json({ expense });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { error, value } = expenseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const expense = await Expense.findOne({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Verify category belongs to user
    const categoryId = typeof value.categoryId === 'string' && !isNaN(value.categoryId) 
      ? parseInt(value.categoryId) 
      : value.categoryId;
      
    const category = await Category.findOne({
      where: {
        id: categoryId,
        [Op.or]: [
          { userId: req.userId },
          { isDefault: true }
        ]
      }
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await expense.update({
      ...value,
      categoryId: categoryId
    });

    const updatedExpense = await Expense.findByPk(expense.id, {
      include: [{ model: Category, as: 'category' }]
    });

    res.json({
      message: 'Expense updated successfully',
      expense: updatedExpense,
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    await expense.destroy();

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getExpenseStats = async (req, res) => {
  try {
    const { year, month, period, startDate, endDate } = req.query;
    const currentDate = new Date();
    
    let dateRange = {};
    let periodLabel = '';

    if (period) {
      // Handle period-based filtering
      const now = new Date();
      switch (period) {
        case 'week':
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          dateRange = { startDate: startOfWeek, endDate: endOfWeek };
          periodLabel = 'This Week';
          break;
        case 'year':
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          dateRange = { startDate: startOfYear, endDate: endOfYear };
          periodLabel = 'This Year';
          break;
        default: // month
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          dateRange = { startDate: startOfMonth, endDate: endOfMonth };
          periodLabel = 'This Month';
          break;
      }
    } else if (startDate && endDate) {
      // Handle custom date range
      dateRange = { startDate: new Date(startDate), endDate: new Date(endDate) };
      periodLabel = 'Custom Range';
    } else {
      // Default to monthly stats (legacy support)
      const targetYear = year || currentDate.getFullYear();
      const targetMonth = month || currentDate.getMonth() + 1;
      const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
      const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
      dateRange = { startDate: startOfMonth, endDate: endOfMonth };
      periodLabel = `${targetMonth}/${targetYear}`;
    }

    const expenses = await Expense.findAll({
      where: {
        userId: req.userId,
        date: {
          [Op.between]: [dateRange.startDate, dateRange.endDate]
        }
      },
      include: [{ model: Category, as: 'category' }]
    });

    // Category breakdown
    const categoryStats = {};
    let totalExpenses = 0;
    let totalIncome = 0;

    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount);
      
      if (expense.type === 'expense') {
        totalExpenses += amount;
        const categoryName = expense.category.name;
        if (!categoryStats[categoryName]) {
          categoryStats[categoryName] = {
            amount: 0,
            count: 0,
            color: expense.category.color
          };
        }
        categoryStats[categoryName].amount += amount;
        categoryStats[categoryName].count += 1;
      } else {
        totalIncome += amount;
      }
    });

    // Time-based breakdown (daily for week/month, monthly for year)
    const timeStats = {};
    if (period === 'year') {
      // Monthly breakdown for year
      for (let month = 0; month < 12; month++) {
        const monthKey = `${dateRange.startDate.getFullYear()}-${String(month + 1).padStart(2, '0')}`;
        timeStats[monthKey] = 0;
      }
      expenses.forEach(expense => {
        if (expense.type === 'expense') {
          const expenseDate = expense.date; // Already in YYYY-MM-DD format
          const [year, month] = expenseDate.split('-');
          const monthKey = `${year}-${month}`;
          timeStats[monthKey] = (timeStats[monthKey] || 0) + parseFloat(expense.amount);
        }
      });
    } else {
      // Daily breakdown for week/month
      const daysDiff = Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24));
      for (let i = 0; i <= daysDiff; i++) {
        const date = new Date(dateRange.startDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        timeStats[dateKey] = 0;
      }
      expenses.forEach(expense => {
        if (expense.type === 'expense') {
          const dateKey = expense.date; // Already in YYYY-MM-DD format
          timeStats[dateKey] = (timeStats[dateKey] || 0) + parseFloat(expense.amount);
        }
      });
    }

    res.json({
      period: periodLabel,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      totalExpenses,
      totalIncome,
      netAmount: totalIncome - totalExpenses,
      categoryBreakdown: Object.entries(categoryStats).map(([name, data]) => ({
        category: name,
        ...data
      })),
      timeBreakdown: Object.entries(timeStats).map(([date, amount]) => ({
        date,
        amount
      }))
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.exportExpenses = async (req, res) => {
  try {
    console.log('Export request received with format:', req.query.format);
    const { format = 'csv', startDate, endDate } = req.query;

    // Authentication is now handled by the route middleware
    const userId = req.userId;

    const where = { userId: userId };
    
    // Only add date filter if both dates are provided and not empty
    if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
      where.date = {
        [Op.between]: [startDate.trim(), endDate.trim()]
      };
    }

    // Add other filters if they have valid values
    if (req.query.type && req.query.type.trim() !== '') {
      where.type = req.query.type.trim();
    }

    if (req.query.categoryId && req.query.categoryId.trim() !== '') {
      where.categoryId = req.query.categoryId.trim();
    }

    if (req.query.search && req.query.search.trim() !== '') {
      where[Op.or] = [
        { description: { [Op.iLike]: `%${req.query.search.trim()}%` } },
        { notes: { [Op.iLike]: `%${req.query.search.trim()}%` } }
      ];
    }

    // Amount filters
    if (req.query.minAmount && req.query.minAmount.trim() !== '') {
      if (!where.amount) where.amount = {};
      where.amount[Op.gte] = parseFloat(req.query.minAmount.trim());
    }
    if (req.query.maxAmount && req.query.maxAmount.trim() !== '') {
      if (!where.amount) where.amount = {};
      where.amount[Op.lte] = parseFloat(req.query.maxAmount.trim());
    }

    console.log('Fetching expenses with where clause:', where);
    
    // Handle sorting
    let orderBy = [['date', 'DESC'], ['created_at', 'DESC']]; // Default sorting
    if (req.query.sortBy && req.query.sortBy.trim() !== '') {
      const sortBy = req.query.sortBy.trim();
      const sortOrder = req.query.sortOrder && req.query.sortOrder.trim() !== '' ? req.query.sortOrder.trim() : 'DESC';
      
      // Validate sort fields
      const validSortFields = ['date', 'amount', 'description', 'created_at'];
      if (validSortFields.includes(sortBy)) {
        orderBy = [[sortBy, sortOrder.toUpperCase()]];
        // Add secondary sort by created_at if not already sorting by it
        if (sortBy !== 'created_at') {
          orderBy.push(['created_at', 'DESC']);
        }
      }
    }
    
    const expenses = await Expense.findAll({
      where,
      include: [{ model: Category, as: 'category' }],
      order: orderBy,
    });

    console.log(`Found ${expenses.length} expenses for export`);

    if (format === 'csv') {
      const fields = ['date', 'description', 'amount', 'type', 'category.name', 'paymentMethod', 'notes'];
      const opts = { fields };
      const parser = new Parser(opts);
      const csv = parser.parse(expenses);

      res.header('Content-Type', 'text/csv');
      res.attachment(`expenses-${Date.now()}.csv`);
      return res.send(csv);
    }

    if (format === 'pdf') {
      console.log('Starting PDF generation...');
      
      try {
        const doc = new PDFDocument({ margin: 50 });
        const filename = `expenses-${Date.now()}.pdf`;

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Handle errors on the PDF document
        doc.on('error', (err) => {
          console.error('PDF document error:', err);
          if (!res.headersSent) {
            res.status(500).json({ message: 'PDF generation failed' });
          }
        });

        // Pipe the PDF to response
        doc.pipe(res);

        // Add title
        doc.fontSize(20).text('Expense Report', { align: 'center' });
        doc.moveDown();

        // Add date range if provided
        if (startDate && endDate) {
          doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
          doc.moveDown();
        }

        // Calculate totals
        let totalExpenses = 0;
        let totalIncome = 0;
        expenses.forEach(expense => {
          if (expense.type === 'expense') {
            totalExpenses += parseFloat(expense.amount);
          } else {
            totalIncome += parseFloat(expense.amount);
          }
        });

        // Add summary
        doc.fontSize(14).text('Summary:', { underline: true });
        doc.fontSize(12);
        doc.text(`Total Expenses: $${totalExpenses.toFixed(2)}`);
        doc.text(`Total Income: $${totalIncome.toFixed(2)}`);
        doc.text(`Net Amount: $${(totalIncome - totalExpenses).toFixed(2)}`);
        doc.text(`Total Transactions: ${expenses.length}`);
        doc.moveDown();

        // Add table header
        doc.fontSize(14).text('Transactions:', { underline: true });
        doc.moveDown(0.5);

        // Table setup
        const startX = 50;
        let currentY = doc.y;
        const rowHeight = 20;
        const colWidths = [80, 120, 60, 50, 100, 80, 100];
        const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Payment', 'Notes'];

        // Draw table headers
        doc.fontSize(10).fillColor('black');
        headers.forEach((header, i) => {
          const x = startX + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0);
          doc.text(header, x, currentY, { width: colWidths[i], align: 'left' });
        });
        currentY += rowHeight;

        // Draw a line under headers
        doc.moveTo(startX, currentY - 5)
           .lineTo(startX + colWidths.reduce((sum, w) => sum + w, 0), currentY - 5)
           .stroke();

        // Add table rows
        expenses.forEach((expense, index) => {
          try {
            // Check if we need a new page
            if (currentY > 700) {
              doc.addPage();
              currentY = 50;
              
              // Redraw headers on new page
              doc.fontSize(10).fillColor('black');
              headers.forEach((header, i) => {
                const x = startX + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0);
                doc.text(header, x, currentY, { width: colWidths[i], align: 'left' });
              });
              currentY += rowHeight;
              
              // Draw line under headers
              doc.moveTo(startX, currentY - 5)
                 .lineTo(startX + colWidths.reduce((sum, w) => sum + w, 0), currentY - 5)
                 .stroke();
            }

            const rowData = [
              expense.date || '',
              expense.description ? (expense.description.length > 15 ? expense.description.substring(0, 15) + '...' : expense.description) : '',
              `$${parseFloat(expense.amount || 0).toFixed(2)}`,
              expense.type || '',
              expense.category?.name || 'N/A',
              expense.paymentMethod || 'N/A',
              expense.notes ? (expense.notes.length > 12 ? expense.notes.substring(0, 12) + '...' : expense.notes) : ''
            ];

            rowData.forEach((data, i) => {
              const x = startX + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0);
              doc.text(String(data), x, currentY, { width: colWidths[i], align: 'left' });
            });

            currentY += rowHeight;
          } catch (rowError) {
            console.error('Error processing row:', index, rowError);
          }
        });

        // Finalize the PDF
        console.log('Finalizing PDF...');
        doc.end();
        console.log('PDF generation completed');
        return;
        
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        if (!res.headersSent) {
          return res.status(500).json({ message: 'PDF generation failed', error: pdfError.message });
        }
      }
    }

    res.json({ expenses });
  } catch (error) {
    console.error('Export expenses error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};