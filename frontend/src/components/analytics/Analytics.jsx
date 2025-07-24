import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Calendar,
  Filter,
  Download,
  Target,
  DollarSign,
  CreditCard,
  Wallet,
  RefreshCw
} from 'lucide-react';
import ExpenseChart from '../dashboard/ExpenseChart';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useAnalyticsData } from '../../hooks/useApiData';
import toast from 'react-hot-toast';

const Analytics = () => {
  const { user } = useAuth();
  const { theme, formatCurrency } = useTheme();
  const [timeRange, setTimeRange] = useState('month');
  const [chartType, setChartType] = useState('bar');

  const { data, loading, errors, refetch } = useAnalyticsData(timeRange);

  // Fallback data structure for when API fails
  const fallbackData = {
    overview: {
      totalExpenses: 3250.75,
      totalIncome: 5000.00,
      netSavings: 1749.25,
      expenseGrowth: -5.2
    },
    categories: [
      { category: 'Food & Dining', amount: 850.50, color: '#EF4444', percentage: 26.2 },
      { category: 'Transportation', amount: 420.25, color: '#3B82F6', percentage: 12.9 },
      { category: 'Shopping', amount: 680.00, color: '#10B981', percentage: 20.9 },
      { category: 'Entertainment', amount: 320.75, color: '#F59E0B', percentage: 9.9 },
      { category: 'Bills & Utilities', amount: 580.25, color: '#8B5CF6', percentage: 17.8 },
      { category: 'Healthcare', amount: 180.50, color: '#EC4899', percentage: 5.6 },
      { category: 'Others', amount: 218.50, color: '#6B7280', percentage: 6.7 }
    ],
    trends: {
      monthlyData: [
        { month: 'Jan', expenses: 2800, income: 5000 },
        { month: 'Feb', expenses: 3100, income: 5000 },
        { month: 'Mar', expenses: 2950, income: 5200 },
        { month: 'Apr', expenses: 3250, income: 5000 },
        { month: 'May', expenses: 3050, income: 5100 },
        { month: 'Jun', expenses: 3250, income: 5000 }
      ],
      weeklyData: [
        { day: 'Mon', amount: 45.50 },
        { day: 'Tue', amount: 32.25 },
        { day: 'Wed', amount: 78.90 },
        { day: 'Thu', amount: 56.75 },
        { day: 'Fri', amount: 125.30 },
        { day: 'Sat', amount: 89.45 },
        { day: 'Sun', amount: 67.20 }
      ]
    },
    topExpenses: [
      { description: 'Grocery Shopping', amount: 156.75, category: 'Food & Dining', date: '2024-01-15' },
      { description: 'Gas Station', amount: 85.50, category: 'Transportation', date: '2024-01-14' },
      { description: 'Restaurant Dinner', amount: 78.25, category: 'Food & Dining', date: '2024-01-13' },
      { description: 'Online Shopping', amount: 125.00, category: 'Shopping', date: '2024-01-12' },
      { description: 'Movie Tickets', amount: 45.50, category: 'Entertainment', date: '2024-01-11' }
    ]
  };

  // Use API data or fallback
  const analyticsData = {
    overview: data.overview || fallbackData.overview,
    categoryBreakdown: data.categories || fallbackData.categories,
    monthlyTrends: data.trends?.monthlyData || fallbackData.trends.monthlyData,
    weeklyPatterns: data.trends?.weeklyData || fallbackData.trends.weeklyData,
    topExpenses: data.topExpenses || fallbackData.topExpenses,
    savingsRate: data.overview?.savingsRate || 34.9
  };

  const refreshData = async () => {
    await refetch();
    toast.success('Analytics data refreshed');
  };

  const exportData = async (format) => {
    try {
      toast.loading('Preparing export...');
      
      if (format === 'csv') {
        // Create CSV content
        let csvContent = 'Category,Amount,Percentage\n';
        analyticsData.categoryBreakdown.forEach(item => {
          csvContent += `${item.category},${item.amount},${item.percentage}%\n`;
        });
        
        csvContent += '\nTop Expenses\n';
        csvContent += 'Description,Amount,Category,Date\n';
        analyticsData.topExpenses.forEach(expense => {
          csvContent += `${expense.description},${expense.amount},${expense.category},${expense.date}\n`;
        });
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast.dismiss();
        toast.success('CSV exported successfully');
      } else if (format === 'pdf') {
        // Use existing PDF export functionality from settings
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Analytics Report', 20, 30);
        
        doc.setFontSize(12);
        doc.text(`Time Range: ${timeRange}`, 20, 50);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 60);
        
        doc.text('Overview:', 20, 80);
        doc.text(`Total Expenses: ${formatCurrency(analyticsData.overview.totalExpenses)}`, 30, 90);
        doc.text(`Total Income: ${formatCurrency(analyticsData.overview.totalIncome)}`, 30, 100);
        doc.text(`Net Savings: ${formatCurrency(analyticsData.overview.netSavings)}`, 30, 110);
        doc.text(`Savings Rate: ${analyticsData.savingsRate}%`, 30, 120);
        
        doc.text('Top Categories:', 20, 140);
        analyticsData.categoryBreakdown.slice(0, 5).forEach((item, index) => {
          doc.text(`${item.category}: ${formatCurrency(item.amount)} (${item.percentage}%)`, 30, 150 + (index * 10));
        });
        
        doc.save(`analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.pdf`);
        
        toast.dismiss();
        toast.success('PDF exported successfully');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Export failed');
      console.error('Export error:', error);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`animate-spin rounded-full h-32 w-32 border-b-2 ${theme === 'dark' ? 'border-blue-400' : 'border-blue-600'}`}></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Analytics</h1>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Detailed insights into your financial patterns</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className={`input-field ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : ''}`}
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          
          <button
            onClick={refreshData}
            disabled={loading}
            className={`btn-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <div className="relative group">
            <button className="btn-outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <div className={`absolute right-0 mt-2 w-48 ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10`}>
              <button
                onClick={() => exportData('csv')}
                className={`block w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} rounded-t-md`}
              >
                Export as CSV
              </button>
              <button
                onClick={() => exportData('pdf')}
                className={`block w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} rounded-b-md`}
              >
                Export as PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Total Expenses</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(analyticsData.overview.totalExpenses)}
                </p>
              </div>
              <div className={`p-3 ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'} rounded-full`}>
                <CreditCard className={`h-6 w-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
              </div>
            </div>
            <div className="mt-2 flex items-center">
              {analyticsData.overview.expenseGrowth < 0 ? (
                <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${analyticsData.overview.expenseGrowth < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(analyticsData.overview.expenseGrowth)}% vs last month
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Total Income</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(analyticsData.overview.totalIncome)}
                </p>
              </div>
              <div className={`p-3 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'} rounded-full`}>
                <DollarSign className={`h-6 w-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Steady income stream</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Net Savings</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(analyticsData.overview.netSavings)}
                </p>
              </div>
              <div className={`p-3 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-full`}>
                <Wallet className={`h-6 w-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600">
                {analyticsData.savingsRate}% savings rate
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Avg Daily Spend</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(analyticsData.overview.totalExpenses / 30)}
                </p>
              </div>
              <div className={`p-3 ${theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'} rounded-full`}>
                <Target className={`h-6 w-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Based on 30 days</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-header">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Spending by Category</h3>
          </div>
          <div className="card-content">
            <ExpenseChart data={analyticsData.categoryBreakdown} type="category" theme={theme} />
            <div className="mt-4 space-y-2">
              {analyticsData.categoryBreakdown.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{item.category}</span>
                  </div>
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Monthly Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-header">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Monthly Trends</h3>
          </div>
          <div className="card-content">
            <ExpenseChart data={analyticsData.monthlyTrends} type="monthly" theme={theme} />
          </div>
        </motion.div>
      </div>

      {/* Weekly Patterns and Top Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Spending Pattern */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-header">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Weekly Spending Pattern</h3>
          </div>
          <div className="card-content">
            <ExpenseChart data={analyticsData.weeklyPatterns} type="weekly" theme={theme} />
          </div>
        </motion.div>

        {/* Top Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-header">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Top Expenses</h3>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              {analyticsData.topExpenses.map((expense, index) => (
                <div key={index} className={`flex items-center justify-between p-3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{expense.description}</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{expense.category} • {expense.date}</p>
                  </div>
                  <span className={`font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{formatCurrency(expense.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Insights and Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
      >
        <div className="card-header">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Financial Insights</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className={`text-center p-4 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-lg`}>
              <TrendingUp className={`h-8 w-8 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} mx-auto mb-2`} />
              <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Spending Trend</h4>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                Your expenses decreased by {Math.abs(analyticsData.overview.expenseGrowth)}% this month. Great job!
              </p>
            </div>
            
            <div className={`text-center p-4 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50'} rounded-lg`}>
              <Target className={`h-8 w-8 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'} mx-auto mb-2`} />
              <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Savings Goal</h4>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                You're saving {analyticsData.savingsRate}% of your income. Excellent progress!
              </p>
            </div>
            
            <div className={`text-center p-4 ${theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-50'} rounded-lg`}>
              <PieChart className={`h-8 w-8 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} mx-auto mb-2`} />
              <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Top Category</h4>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                {analyticsData.categoryBreakdown[0]?.category || 'Food & Dining'} is your highest expense at {analyticsData.categoryBreakdown[0]?.percentage || 26.2}%
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;