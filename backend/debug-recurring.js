const { RecurringTransaction, Expense, User } = require('./models');
const { Op } = require('sequelize');

async function debugRecurringTransactions() {
  try {
    console.log('=== Debugging Recurring Transactions ===');
    
    // Get all recurring transactions
    const recurring = await RecurringTransaction.findAll({
      where: { isActive: true },
      include: [{ model: User, attributes: ['email'] }],
      order: [['nextDueDate', 'ASC']]
    });
    
    console.log(`Found ${recurring.length} active recurring transactions:`);
    
    for (const rt of recurring) {
      console.log(`\n--- Recurring Transaction ${rt.id} ---`);
      console.log('User:', rt.User.email);
      console.log('Type:', rt.type);
      console.log('Amount:', rt.amount);
      console.log('Description:', rt.description);
      console.log('Frequency:', rt.frequency);
      console.log('Next Due:', rt.nextDueDate);
      console.log('Current Occurrences:', rt.currentOccurrences);
      console.log('Last Processed:', rt.lastProcessed);
      
      // Check if due today
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dueDate = new Date(rt.nextDueDate.getFullYear(), rt.nextDueDate.getMonth(), rt.nextDueDate.getDate());
      
      console.log('Today:', today.toDateString());
      console.log('Due Date:', dueDate.toDateString());
      console.log('Is Due?', dueDate <= today);
      
      // Check recent expenses created from this recurring transaction
      const recentExpenses = await Expense.findAll({
        where: {
          userId: rt.userId,
          type: rt.type,
          amount: rt.amount,
          description: { [Op.like]: `%${rt.description}%` },
          createdAt: { [Op.gte]: new Date(Date.now() - 48 * 60 * 60 * 1000) } // Last 48 hours
        },
        order: [['createdAt', 'DESC']]
      });
      
      console.log(`Recent expenses (last 48h): ${recentExpenses.length}`);
      recentExpenses.forEach((exp, i) => {
        console.log(`  ${i+1}. ${exp.description} - $${exp.amount} - ${exp.createdAt}`);
      });
    }
    
    // Also check for duplicate expenses that might indicate the issue
    console.log('\n=== Checking for Duplicate Expenses ===');
    
    const duplicateCheck = await Expense.findAll({
      where: {
        description: { [Op.like]: '%(Recurring)%' },
        createdAt: { [Op.gte]: new Date(Date.now() - 48 * 60 * 60 * 1000) }
      },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Total recurring expenses in last 48h: ${duplicateCheck.length}`);
    
    // Group by description and amount to find duplicates
    const grouped = {};
    duplicateCheck.forEach(exp => {
      const key = `${exp.description}-${exp.amount}-${exp.type}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(exp);
    });
    
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length > 1) {
        console.log(`\n🔴 DUPLICATE FOUND: ${key}`);
        grouped[key].forEach((exp, i) => {
          console.log(`  ${i+1}. ID: ${exp.id}, Created: ${exp.createdAt}`);
        });
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

debugRecurringTransactions();
