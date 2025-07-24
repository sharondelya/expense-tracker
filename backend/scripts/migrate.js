const sequelize = require('../config/database');
const { User, Expense, Category, RecurringTransaction, ExpenseSplit, SplitGroup, FinancialGoal, SavingsTransaction } = require('../models');

// Import associations to ensure they are set up
require('../config/associations');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync all models with the database
    await sequelize.sync({ force: false, alter: true });
    
    console.log('✅ Database migration completed successfully!');
    console.log('📊 All tables have been created/updated.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();