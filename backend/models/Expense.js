const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01,
    },
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 255],
    },
  },
  notes: {
    type: DataTypes.TEXT,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  type: {
    type: DataTypes.ENUM('expense', 'income'),
    defaultValue: 'expense',
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'bank_transfer', 'digital_wallet', 'other'),
    defaultValue: 'card',
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  recurringFrequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'),
    allowNull: true,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  receipt: {
    type: DataTypes.TEXT, // base64 encoded image or file path
  },
  receiptData: {
    type: DataTypes.BLOB('long'), // Store binary image data
    allowNull: true,
  },
  receiptUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  receiptOriginalName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  receiptSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  receiptMimeType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  receiptUploadedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id',
    },
  },
});

module.exports = Expense;