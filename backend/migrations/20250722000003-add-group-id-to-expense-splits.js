'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if the column already exists to avoid errors
    const tableInfo = await queryInterface.describeTable('expense_splits');
    
    if (!tableInfo.group_id) {
      await queryInterface.addColumn('expense_splits', 'group_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'split_groups',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      
      // Add index for better query performance
      await queryInterface.addIndex('expense_splits', ['group_id'], {
        name: 'idx_expense_splits_group_id'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Check if the column exists before trying to remove it
    const tableInfo = await queryInterface.describeTable('expense_splits');
    
    if (tableInfo.group_id) {
      await queryInterface.removeIndex('expense_splits', 'idx_expense_splits_group_id');
      await queryInterface.removeColumn('expense_splits', 'group_id');
    }
  }
};
