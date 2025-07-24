import React from 'react';
import { motion } from 'framer-motion';
import { 
  Edit, 
  Trash2, 
  Plus, 
  Calendar, 
  DollarSign,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const GoalCard = ({ 
  goal, 
  categoryIcons, 
  statusColors, 
  statusIcons, 
  onEdit, 
  onDelete, 
  onAddSavings 
}) => {
  const { isDarkMode } = useTheme();
  const CategoryIcon = categoryIcons[goal.category] || categoryIcons.other;
  const StatusIcon = statusIcons[goal.status];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-lg border ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      } hover:shadow-lg transition-shadow`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <CategoryIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {goal.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[goal.status]}`}>
                <StatusIcon className="w-3 h-3 inline mr-1" />
                {goal.status}
              </span>
              <span className={`text-xs font-medium capitalize ${getPriorityColor(goal.priority)}`}>
                {goal.priority} priority
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(goal)}
            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      {goal.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {goal.description}
        </p>
      )}

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {goal.progress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(goal.progress)}`}
            style={{ width: `${Math.min(goal.progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Amount Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Current</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(goal.current_amount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Target</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(goal.target_amount)}
          </p>
        </div>
      </div>

      {/* Target Date */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Target: {formatDate(goal.target_date)}
        </span>
        {goal.is_overdue && (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        )}
      </div>

      {/* Days Remaining */}
      {goal.days_remaining !== undefined && (
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <span className={`text-sm ${
            goal.days_remaining < 0 
              ? 'text-red-600 dark:text-red-400' 
              : goal.days_remaining < 30
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            {goal.days_remaining < 0 
              ? `${Math.abs(goal.days_remaining)} days overdue`
              : `${goal.days_remaining} days remaining`
            }
          </span>
        </div>
      )}

      {/* Auto Save Info */}
      {goal.auto_save_amount && (
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-green-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Auto-save: {formatCurrency(goal.auto_save_amount)} {goal.auto_save_frequency}
          </span>
        </div>
      )}

      {/* Action Button */}
      {goal.status === 'active' && (
        <button
          onClick={() => onAddSavings(goal)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Savings
        </button>
      )}

      {goal.status === 'completed' && (
        <div className="w-full px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-center font-medium">
          🎉 Goal Completed!
        </div>
      )}
    </motion.div>
  );
};

export default GoalCard;