const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExpenseSplit = sequelize.define('ExpenseSplit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  expense_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'expenses',
      key: 'id'
    }
  },
  payer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  group_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'split_groups',
      key: 'id'
    }
  },
  participant_email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  participant_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  split_type: {
    type: DataTypes.ENUM('equal', 'percentage', 'amount'),
    allowNull: false,
    defaultValue: 'equal'
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'paid', 'declined'),
    allowNull: false,
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  settled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'expense_splits',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ExpenseSplit;