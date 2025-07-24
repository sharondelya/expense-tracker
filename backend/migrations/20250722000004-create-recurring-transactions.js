'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('recurring_transactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
      type: {
        type: Sequelize.ENUM('income', 'expense'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      frequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
        allowNull: false
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      next_due_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      last_processed: {
        type: Sequelize.DATE,
        allowNull: true
      },
      total_occurrences: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      current_occurrences: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      day_of_month: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 31
        }
      },
      day_of_week: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 6
        }
      },
      month_of_year: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 12
        }
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.addIndex('recurring_transactions', ['user_id']);
    await queryInterface.addIndex('recurring_transactions', ['next_due_date']);
    await queryInterface.addIndex('recurring_transactions', ['is_active']);
    await queryInterface.addIndex('recurring_transactions', ['user_id', 'is_active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('recurring_transactions');
  }
};
