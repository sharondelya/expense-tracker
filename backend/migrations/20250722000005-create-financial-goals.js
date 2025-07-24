'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('financial_goals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      target_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      current_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      target_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      category: {
        type: Sequelize.ENUM('emergency_fund', 'vacation', 'house', 'car', 'education', 'retirement', 'debt_payoff', 'other'),
        defaultValue: 'other'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium'
      },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'paused', 'cancelled'),
        defaultValue: 'active'
      },
      auto_save_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      auto_save_frequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly'),
        allowNull: true
      },
      reminder_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      reminder_frequency: {
        type: Sequelize.ENUM('weekly', 'monthly'),
        defaultValue: 'monthly'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('financial_goals', ['user_id']);
    await queryInterface.addIndex('financial_goals', ['status']);
    await queryInterface.addIndex('financial_goals', ['target_date']);
    await queryInterface.addIndex('financial_goals', ['user_id', 'status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('financial_goals');
  }
};
