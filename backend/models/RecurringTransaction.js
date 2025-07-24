const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecurringTransaction = sequelize.define('RecurringTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('income', 'expense'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'category_id',
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  frequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  nextDueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'next_due_date'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastProcessed: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_processed'
  },
  totalOccurrences: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'total_occurrences'
  },
  currentOccurrences: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'current_occurrences'
  },
  dayOfMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'day_of_month'
  },
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'day_of_week'
  },
  monthOfYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'month_of_year'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'recurring_transactions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['next_due_date']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = RecurringTransaction;