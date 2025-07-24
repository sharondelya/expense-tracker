const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SavingsTransaction = sequelize.define('SavingsTransaction', {
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
  goal_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'financial_goals',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  transaction_type: {
    type: DataTypes.ENUM('deposit', 'withdrawal'),
    defaultValue: 'deposit'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  transaction_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  is_automatic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this was an automatic savings transaction'
  },
  source: {
    type: DataTypes.ENUM('manual', 'auto_save', 'round_up', 'goal_transfer'),
    defaultValue: 'manual'
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
  tableName: 'savings_transactions',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['goal_id']
    },
    {
      fields: ['transaction_date']
    },
    {
      fields: ['transaction_type']
    }
  ]
});

module.exports = SavingsTransaction;