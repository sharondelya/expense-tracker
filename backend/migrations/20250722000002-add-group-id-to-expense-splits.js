'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
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
    await queryInterface.addIndex('expense_splits', ['group_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('expense_splits', ['group_id']);
    await queryInterface.removeColumn('expense_splits', 'group_id');
  }
};
