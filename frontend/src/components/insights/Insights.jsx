import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  Calendar,
  DollarSign,
  PieChart,
  BarChart3,
  LineChart,
  Filter,
  Download,
  RefreshCw,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Award,
  Eye,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  AreaChart,
  BarChart,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  Bar,
  Line,
  Pie
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useBatchApiData } from '../../hooks/useApiData';
import apiManager from '../../services/apiManager';

const Insights = () => {
  const { theme } = useTheme();
  const { addNotification } = useNotifications();
  const [selectedPeriod, setSelectedPeriod] = useState('3months');
  const [selectedTrendPeriod, setSelectedTrendPeriod] = useState('12months');
  const [selectedView, setSelectedView] = useState('overview');

  // Use batch API data loading for insights
  const {
    data,
    loading,
    error,
    refetch
  } = useBatchApiData([
    { key: 'insights', url: `/insights/spending?period=${selectedPeriod}` },
    { key: 'trends', url: `/insights/trends?period=${selectedTrendPeriod}` },
    { key: 'recommendations', url: '/insights/recommendations' }
  ], [selectedPeriod, selectedTrendPeriod]);

  const insights = data?.insights?.insights || null;
  const trends = data?.trends?.trends || null;
  const recommendations = data?.recommendations?.recommendations || [];

  const periods = [
    { value: '1month', label: '1 Month' },
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
    { value: '1year', label: '1 Year' }
  ];

  const trendPeriods = [
    { value: '30days', label: '30 Days' },
    { value: '6months', label: '6 Months' },
    { value: '12months', label: '12 Months' },
    { value: '2years', label: '2 Years' }
  ];

  const views = [
    { value: 'overview', label: 'Overview', icon: Eye },
    { value: 'trends', label: 'Trends', icon: TrendingUp },
    { value: 'patterns', label: 'Patterns', icon: BarChart3 },
    { value: 'recommendations', label: 'Recommendations', icon: Lightbulb }
  ];

  // Handle errors with specific messaging for rate limiting
  useEffect(() => {
    if (error) {
      let errorMessage = 'Failed to load insights data';
      
      if (error.message?.includes('429') || error.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      addNotification({
        type: 'error',
        message: errorMessage
      });
    }
  }, [error, addNotification]);

  const refreshData = async () => {
    try {
      await refetch();
      addNotification({
        type: 'success',
        message: 'Data refreshed successfully'
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      addNotification({
        type: 'error',
        message: 'Failed to refresh data'
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    if (!isFinite(value) || isNaN(value)) {
      return 'N/A';
    }
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-red-500" />;
    if (change < 0) return <ArrowDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      case 'suggestion': return <Lightbulb className="w-5 h-5 text-purple-500" />;
      case 'positive': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const chartColors = {
    primary: theme === 'dark' ? '#3B82F6' : '#2563EB',
    secondary: theme === 'dark' ? '#10B981' : '#059669',
    accent: theme === 'dark' ? '#F59E0B' : '#D97706',
    danger: theme === 'dark' ? '#EF4444' : '#DC2626',
    purple: theme === 'dark' ? '#8B5CF6' : '#7C3AED',
    pink: theme === 'dark' ? '#EC4899' : '#DB2777'
  };

  const renderOverview = () => {
    if (!insights) return <div>Loading insights...</div>;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(insights.overview.totalSpending)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {getChangeIcon(insights.overview.percentageChange)}
              <span className={`ml-2 text-sm font-medium ${
                insights.overview.percentageChange > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatPercentage(insights.overview.percentageChange)} vs previous period
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Daily Average</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(insights.overview.dailyAverage)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {insights.overview.transactionCount} transactions
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Transaction</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(insights.overview.averageTransactionAmount)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Spending Streak</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {insights.patterns.spendingStreak.current} days
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Longest: {insights.patterns.spendingStreak.longest} days
              </span>
            </div>
          </motion.div>
        </div>

        {/* Category Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Category Performance
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                Top Categories
              </h4>
              <div className="space-y-3">
                {insights.categoryInsights.topCategories.slice(0, 5).map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {category.category}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(category.current)}
                      </span>
                      <div className="flex items-center">
                        {getChangeIcon(category.change)}
                        <span className={`text-xs ${
                          category.change > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatPercentage(category.change)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                Category Distribution
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={Object.entries(insights.categoryInsights.categoryDistribution).map(([name, value]) => ({
                      name,
                      value,
                      fill: chartColors.primary
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {Object.entries(insights.categoryInsights.categoryDistribution).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(chartColors)[index % Object.values(chartColors).length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Alerts */}
        {insights.alerts && insights.alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Alerts & Notifications
            </h3>
            <div className="space-y-3">
              {insights.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === 'high' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' :
                    alert.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                    'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  }`}
                >
                  <div className="flex items-start">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 mr-3 ${
                      alert.severity === 'high' ? 'text-red-500' :
                      alert.severity === 'medium' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`} />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {alert.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  const renderTrends = () => {
    if (!trends) return <div>Loading trends...</div>;

    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Spending Trends Over Time
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={trends.overall}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
              <XAxis 
                dataKey="period" 
                stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              />
              <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
              <Tooltip 
                formatter={(value, name) => [formatCurrency(value), name === 'expense' ? 'Expenses' : 'Income']}
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                  border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="expense"
                stackId="1"
                stroke={chartColors.danger}
                fill={chartColors.danger}
                fillOpacity={0.6}
                name="Expenses"
              />
              <Area
                type="monotone"
                dataKey="income"
                stackId="2"
                stroke={chartColors.secondary}
                fill={chartColors.secondary}
                fillOpacity={0.6}
                name="Income"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    );
  };

  const renderPatterns = () => {
    if (!insights) return <div>Loading patterns...</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Day of Week Spending */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Spending by Day of Week
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(insights.patterns.dayOfWeekSpending).map(([day, amount]) => ({
                day: day.substring(0, 3),
                amount
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                <XAxis dataKey="day" stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="amount" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Monthly Spending */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Monthly Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(insights.patterns.monthlySpending).map(([month, amount]) => ({
                month: month.substring(0, 3),
                amount
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                <XAxis dataKey="month" stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="amount" fill={chartColors.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Pattern Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Spending Patterns
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.patterns.highestSpendingDay && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Highest Spending Day
                  </h4>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {insights.patterns.highestSpendingDay.day}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatCurrency(insights.patterns.highestSpendingDay.amount)} total
                </p>
              </div>
            )}

            {insights.patterns.highestSpendingMonth && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center">
                  <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Highest Spending Month
                  </h4>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {insights.patterns.highestSpendingMonth.month}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatCurrency(insights.patterns.highestSpendingMonth.amount)} total
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  const renderRecommendations = () => {
    return (
      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm border border-gray-200 dark:border-gray-700 text-center"
          >
            <Award className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Great Job!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You're managing your finances well. Keep up the good work!
            </p>
          </motion.div>
        ) : (
          recommendations.map((recommendation, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border-l-4 ${getPriorityColor(recommendation.priority)}`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-4">
                  {getRecommendationIcon(recommendation.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {recommendation.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      recommendation.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {recommendation.priority}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {recommendation.message}
                  </p>
                  {recommendation.actionable && recommendation.actions && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        Suggested Actions:
                      </h4>
                      <ul className="list-disc list-inside space-y-1">
                        {recommendation.actions.map((action, actionIndex) => (
                          <li key={actionIndex} className="text-sm text-gray-600 dark:text-gray-400">
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Financial Insights
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Discover patterns and trends in your spending behavior
          </p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {views.map((view) => {
          const IconComponent = view.icon;
          return (
            <button
              key={view.value}
              onClick={() => setSelectedView(view.value)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedView === view.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <IconComponent className="w-4 h-4 mr-2" />
              {view.label}
            </button>
          );
        })}
      </div>

      {/* Period Selector */}
      {(selectedView === 'overview' || selectedView === 'patterns') && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Analysis Period
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {periods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Trend Period Selector */}
      {selectedView === 'trends' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Trend Period
          </label>
          <select
            value={selectedTrendPeriod}
            onChange={(e) => setSelectedTrendPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {trendPeriods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      <div className="min-h-[400px]">
        {selectedView === 'overview' && renderOverview()}
        {selectedView === 'trends' && renderTrends()}
        {selectedView === 'patterns' && renderPatterns()}
        {selectedView === 'recommendations' && renderRecommendations()}
      </div>
    </div>
  );
};

export default Insights;