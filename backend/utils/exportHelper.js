const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');

const exportToCSV = (data, fields) => {
  const parser = new Parser({ fields });
  return parser.parse(data);
};

const exportToExcel = async (data, sheetName = 'Expenses') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length > 0) {
    // Add headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Add data
    data.forEach(row => {
      worksheet.addRow(Object.values(row));
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366EF1' }
    };
  }

  return await workbook.xlsx.writeBuffer();
};

const formatExpenseData = (expenses) => {
  return expenses.map(expense => ({
    Date: expense.date,
    Description: expense.description,
    Amount: parseFloat(expense.amount),
    Type: expense.type,
    Category: expense.category?.name || 'Unknown',
    'Payment Method': expense.paymentMethod,
    Notes: expense.notes || '',
    Tags: Array.isArray(expense.tags) ? expense.tags.join(', ') : ''
  }));
};

module.exports = {
  exportToCSV,
  exportToExcel,
  formatExpenseData
};