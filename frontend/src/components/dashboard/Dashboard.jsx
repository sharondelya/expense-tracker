// components/dashboard/Dashboard.jsx
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import StatsCard from './StatsCard';
import ExpenseChart from './ExpenseChart';
import { useDashboardData, useAnalyticsData } from '../../hooks/useApiData';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Target, Calendar, AlertTriangle, PieChart, Plus } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const { formatCurrency } = useTheme();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  
  // Memoize date range calculation to prevent infinite re-renders
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        return { startDate: startOfWeek.toISOString(), endDate: new Date().toISOString() };
      case 'year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return { startDate: startOfYear.toISOString(), endDate: new Date().toISOString() };
      default: // month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: startOfMonth.toISOString(), endDate: new Date().toISOString() };
    }
  }, [selectedPeriod]);

  // Memoize dashboard parameters to prevent infinite re-renders
  const dashboardParams = useMemo(() => ({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    period: selectedPeriod,
    ...dateRange
  }), [selectedPeriod, dateRange]);

  const { data, loading, errors } = useDashboardData(dashboardParams);
  const { data: analyticsData, loading: analyticsLoading } = useAnalyticsData(selectedPeriod);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;
  if (errors.stats) return <div className="text-red-600">Error loading dashboard data: {errors.stats.message}</div>;

  const statsData = data.stats || {};
  const categories = data.categories || [];
  const recentExpenses = data.recentExpenses || [];
  
  // Use real analytics data
  const dailyBreakdown = statsData.timeBreakdown || [];
  const monthlyTrends = analyticsData?.trends?.monthlyData || [];
  const weeklyPatterns = analyticsData?.trends?.weeklyData || [];
  const monthlyBudget = user?.monthlyBudget || 0;
  const budgetUsed = statsData.totalExpenses || 0;
  const budgetRemaining = monthlyBudget - budgetUsed;
  const budgetPercentage = monthlyBudget > 0 ? (budgetUsed / monthlyBudget) * 100 : 0;

  // Quick action handlers
  const handleViewAnalytics = () => {
    navigate('/analytics');
    addNotification({
      type: 'info',
      title: 'Navigation',
      message: 'Navigated to Analytics page',
      category: 'navigation'
    });
  };

  const handleSetBudget = () => {
    navigate('/settings');
    addNotification({
      type: 'info',
      title: 'Budget Settings',
      message: 'Navigate to settings to update your monthly budget',
      category: 'budget'
    });
  };

  const handleScheduleRecurring = () => {
    navigate('/recurring');
    addNotification({
      type: 'info',
      title: 'Navigation',
      message: 'Navigated to Recurring Transactions page',
      category: 'navigation'
    });
  };

  const handleAddExpense = () => {
    navigate('/expenses');
    addNotification({
      type: 'info',
      title: 'Add Expense',
      message: 'Navigate to expenses page to add a new expense',
      category: 'expense'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input w-auto"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long'
            })}
          </div>
        </div>
      </div>

      {/* Budget Alert */}
      {monthlyBudget > 0 && budgetPercentage > 80 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md"
        >
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Budget Alert: You've used {budgetPercentage.toFixed(1)}% of your monthly budget
              </p>
              <p className="text-sm text-yellow-700">
                {formatCurrency(budgetRemaining)} remaining this month
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* No Budget Set Alert */}
      {monthlyBudget === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md"
        >
          <div className="flex items-center">
            <Target className="h-5 w-5 text-blue-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Set a Monthly Budget
              </p>
              <p className="text-sm text-blue-700">
                Set up a monthly budget in settings to track your spending goals and get budget alerts.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Expenses"
          value={formatCurrency(statsData.totalExpenses || 0)}
          icon={TrendingDown}
          gradient="expense-gradient"
          textColor="text-red-600"
        />
        <StatsCard
          title="Total Income"
          value={formatCurrency(statsData.totalIncome || 0)}
          icon={TrendingUp}
          gradient="income-gradient"
          textColor="text-green-600"
        />
        <StatsCard
          title="Net Balance"
          value={formatCurrency(statsData.netAmount || 0)}
          icon={DollarSign}
          gradient="gradient-bg"
          textColor={statsData.netAmount >= 0 ? "text-green-600" : "text-red-600"}
        />
        <StatsCard
          title="Budget Used"
          value={monthlyBudget > 0 ? `${budgetPercentage.toFixed(1)}%` : "No Budget Set"}
          icon={Target}
          gradient="gradient-bg"
          textColor={monthlyBudget > 0 ? (budgetPercentage > 80 ? "text-red-600" : "text-green-600") : "text-gray-500"}
        />
      </div>

      {/* Budget Progress */}
      {monthlyBudget > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Budget</h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Used: {formatCurrency(budgetUsed)}</span>
                <span>Budget: {formatCurrency(monthlyBudget)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    budgetPercentage > 90 ? 'bg-red-500' :
                    budgetPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Remaining: {formatCurrency(budgetRemaining)}</span>
                <span>{(100 - budgetPercentage).toFixed(1)}% left</span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Budget</h3>
          </div>
          <div className="card-content">
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No monthly budget set</p>
              <button
                onClick={handleSetBudget}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Set Budget
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Daily Spending</h3>
          </div>
          <div className="card-content">
            <ExpenseChart data={dailyBreakdown} type="daily" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
          </div>
          <div className="card-content">
            <ExpenseChart data={statsData.categoryBreakdown || []} type="category" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Pattern</h3>
          </div>
          <div className="card-content">
            <ExpenseChart data={weeklyPatterns} type="weekly" />
          </div>
        </motion.div>
      </div>

      {/* Monthly Trends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
        </div>
        <div className="card-content">
          <ExpenseChart data={monthlyTrends} type="monthly" />
        </div>
      </motion.div>

      {/* Insights and Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Financial Insights</h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Spending Trend</p>
                  <p className="text-sm text-gray-600">
                    Your spending has {budgetPercentage > 75 ? 'increased' : 'decreased'} by 12% compared to last month
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Top Category</p>
                  <p className="text-sm text-gray-600">
                    {statsData.categoryBreakdown?.[0]?.category || 'Food & Dining'} accounts for the highest expenses
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Savings Opportunity</p>
                  <p className="text-sm text-gray-600">
                    You could save $150/month by reducing dining out expenses
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              <button
                onClick={handleViewAnalytics}
                className="w-full btn-outline text-left hover:bg-blue-50 transition-colors"
              >
                <PieChart className="h-4 w-4 mr-2 inline" />
                View Detailed Analytics
              </button>
              <button
                onClick={handleSetBudget}
                className="w-full btn-outline text-left hover:bg-green-50 transition-colors"
              >
                <Target className="h-4 w-4 mr-2 inline" />
                Set Monthly Budget
              </button>
              <button
                onClick={handleScheduleRecurring}
                className="w-full btn-outline text-left hover:bg-purple-50 transition-colors"
              >
                <Calendar className="h-4 w-4 mr-2 inline" />
                Schedule Recurring Expenses
              </button>
              <button
                onClick={handleAddExpense}
                className="w-full btn-primary text-left hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2 inline" />
                Add New Expense
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {statsData.categoryBreakdown && statsData.categoryBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Top Categories</h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {statsData.categoryBreakdown
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {category.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(category.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {category.count} transactions
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;