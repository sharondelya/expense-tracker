const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FinancialGoal = sequelize.define('FinancialGoal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  target_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  current_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  target_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('emergency_fund', 'vacation', 'house', 'car', 'education', 'retirement', 'debt_payoff', 'other'),
    defaultValue: 'other'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'paused', 'cancelled'),
    defaultValue: 'active'
  },
  auto_save_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Amount to automatically save towards this goal'
  },
  auto_save_frequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
    allowNull: true,
    comment: 'Frequency for automatic savings'
  },
  reminder_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  reminder_frequency: {
    type: DataTypes.ENUM('weekly', 'monthly'),
    defaultValue: 'monthly'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'financial_goals',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['target_date']
    }
  ]
});

module.exports = FinancialGoal;