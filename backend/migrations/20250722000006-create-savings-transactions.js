'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('savings_transactions', {
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
      goal_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'financial_goals',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      transaction_type: {
        type: Sequelize.ENUM('deposit', 'withdrawal'),
        defaultValue: 'deposit'
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      transaction_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      is_automatic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      source: {
        type: Sequelize.ENUM('manual', 'auto_save', 'round_up', 'goal_transfer'),
        defaultValue: 'manual'
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
    await queryInterface.addIndex('savings_transactions', ['user_id']);
    await queryInterface.addIndex('savings_transactions', ['goal_id']);
    await queryInterface.addIndex('savings_transactions', ['transaction_date']);
    await queryInterface.addIndex('savings_transactions', ['transaction_type']);
    await queryInterface.addIndex('savings_transactions', ['user_id', 'goal_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('savings_transactions');
  }
};
