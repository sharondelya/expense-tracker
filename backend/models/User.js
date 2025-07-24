const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100],
    },
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 50],
    },
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 50],
    },
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD',
    validate: {
      len: [3, 3],
    },
  },
  monthlyBudget: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  monthlyGoal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  // Email notification preferences
  emailAlerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  pushNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  weeklyReports: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  monthlyReports: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  budgetAlerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // Theme and display preferences
  theme: {
    type: DataTypes.STRING,
    defaultValue: 'light',
    validate: {
      isIn: [['light', 'dark']],
    },
  },
  dateFormat: {
    type: DataTypes.STRING,
    defaultValue: 'MM/DD/YYYY',
    validate: {
      isIn: [['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']],
    },
  },
  // Budget settings per category (JSON field)
  budgets: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  // User preferences
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {
      defaultCategory: null,
      autoCategories: true,
      showTips: true,
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  emailVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  profilePicture: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
      // Set email as verified for now (in production, implement email verification)
      user.emailVerifiedAt = new Date();
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

User.prototype.updateLastLogin = async function() {
  this.lastLoginAt = new Date();
  await this.save();
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = User;