import React from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  DollarSign, 
  TrendingUp, 
  CheckCircle,
  Clock,
  PiggyBank
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const GoalStats = ({ stats }) => {
  const { isDarkMode } = useTheme();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Process stats data
  const processedStats = stats.stats?.reduce((acc, stat) => {
    acc[stat.status] = {
      count: parseInt(stat.count),
      total_target: parseFloat(stat.total_target || 0),
      total_saved: parseFloat(stat.total_saved || 0)
    };
    return acc;
  }, {}) || {};

  const totalGoals = Object.values(processedStats).reduce((sum, stat) => sum + stat.count, 0);
  const totalTargetAmount = Object.values(processedStats).reduce((sum, stat) => sum + stat.total_target, 0);
  const totalSavedAmount = Object.values(processedStats).reduce((sum, stat) => sum + stat.total_saved, 0);
  const overallProgress = totalTargetAmount > 0 ? (totalSavedAmount / totalTargetAmount) * 100 : 0;

  const activeGoals = processedStats.active?.count || 0;
  const completedGoals = processedStats.completed?.count || 0;

  // Calculate monthly savings from trend data
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthSavings = stats.monthly_trend?.find(trend => {
    const trendDate = new Date(trend.month);
    return trendDate.getMonth() === currentMonth && trendDate.getFullYear() === currentYear;
  })?.total_saved || 0;

  const statCards = [
    {
      title: 'Total Goals',
      value: totalGoals,
      icon: Target,
      color: 'blue',
      format: 'number'
    },
    {
      title: 'Active Goals',
      value: activeGoals,
      icon: Clock,
      color: 'yellow',
      format: 'number'
    },
    {
      title: 'Completed Goals',
      value: completedGoals,
      icon: CheckCircle,
      color: 'green',
      format: 'number'
    },
    {
      title: 'Total Target',
      value: totalTargetAmount,
      icon: DollarSign,
      color: 'purple',
      format: 'currency'
    },
    {
      title: 'Total Saved',
      value: totalSavedAmount,
      icon: PiggyBank,
      color: 'green',
      format: 'currency'
    },
    {
      title: 'This Month',
      value: currentMonthSavings,
      icon: TrendingUp,
      color: 'blue',
      format: 'currency'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-500 text-blue-100',
      green: 'bg-green-500 text-green-100',
      yellow: 'bg-yellow-500 text-yellow-100',
      purple: 'bg-purple-500 text-purple-100',
      red: 'bg-red-500 text-red-100'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stat.format === 'currency' 
                    ? formatCurrency(stat.value)
                    : stat.value.toLocaleString()
                  }
                </p>
              </div>
              <div className={`p-2 rounded-lg ${getColorClasses(stat.color)}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Overall Progress */}
      {totalTargetAmount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={`p-6 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Overall Progress
            </h3>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {overallProgress.toFixed(1)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(overallProgress, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Saved: {formatCurrency(totalSavedAmount)}</span>
            <span>Target: {formatCurrency(totalTargetAmount)}</span>
          </div>
        </motion.div>
      )}

      {/* Monthly Trend Preview */}
      {stats.monthly_trend && stats.monthly_trend.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={`p-6 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Savings Trend (Last 6 Months)
          </h3>
          
          <div className="flex items-end justify-between h-32 gap-2">
            {stats.monthly_trend.slice(-6).map((trend, index) => {
              const maxAmount = Math.max(...stats.monthly_trend.slice(-6).map(t => parseFloat(t.total_saved)));
              const height = maxAmount > 0 ? (parseFloat(trend.total_saved) / maxAmount) * 100 : 0;
              const date = new Date(trend.month);
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600"
                    style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0px' }}
                    title={`${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}: ${formatCurrency(trend.total_saved)}`}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {date.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GoalStats;