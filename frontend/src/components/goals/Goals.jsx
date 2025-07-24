import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  Plus, 
  DollarSign, 
  Calendar, 
  TrendingUp,
  CheckCircle,
  Clock,
  Pause,
  X,
  Filter,
  Search,
  PiggyBank,
  Home,
  Car,
  GraduationCap,
  Plane,
  Heart,
  Shield,
  MoreHorizontal
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import GoalModal from './GoalModal';
import SavingsModal from './SavingsModal';
import GoalCard from './GoalCard';
import GoalStats from './GoalStats';
import { useBatchApiData } from '../../hooks/useApiData';
import apiManager from '../../services/apiManager';
import toast from 'react-hot-toast';

const Goals = () => {
  const { isDarkMode } = useTheme();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');

  // Use batch API data loading for goals and stats
  const {
    data,
    loading,
    error,
    refetch
  } = useBatchApiData([
    { key: 'goals', url: '/goals' },
    { key: 'stats', url: '/goals/stats' }
  ]);

  const goals = data?.goals?.goals || [];
  const stats = data?.stats || null;

  const categoryIcons = {
    emergency_fund: Shield,
    vacation: Plane,
    house: Home,
    car: Car,
    education: GraduationCap,
    retirement: PiggyBank,
    debt_payoff: DollarSign,
    other: MoreHorizontal
  };

  const statusColors = {
    active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  };

  const statusIcons = {
    active: Clock,
    completed: CheckCircle,
    paused: Pause,
    cancelled: X
  };

  // Handle errors with specific messaging for rate limiting
  useEffect(() => {
    if (error) {
      let errorMessage = 'Failed to load goals data';
      
      if (error.message?.includes('429') || error.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage);
    }
  }, [error]);

  const handleCreateGoal = () => {
    setSelectedGoal(null);
    setShowGoalModal(true);
  };

  const handleEditGoal = (goal) => {
    setSelectedGoal(goal);
    setShowGoalModal(true);
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      return;
    }

    try {
      await apiManager.delete(`/goals/${goalId}`);
      toast.success('Goal deleted successfully');
      
      // Invalidate cache and refetch data
      apiManager.invalidateCache('/goals');
      apiManager.invalidateCache('/goals/stats');
      await refetch();
    } catch (error) {
      console.error('Error deleting goal:', error);
      
      let errorMessage = 'Failed to delete goal';
      if (error.message?.includes('429') || error.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }
      
      toast.error(errorMessage);
    }
  };

  const handleAddSavings = (goal) => {
    setSelectedGoal(goal);
    setShowSavingsModal(true);
  };

  const handleGoalSuccess = async () => {
    // Invalidate cache and refetch data
    apiManager.invalidateCache('/goals');
    apiManager.invalidateCache('/goals/stats');
    await refetch();
    setShowGoalModal(false);
    setSelectedGoal(null);
  };

  const handleSavingsSuccess = async () => {
    // Invalidate cache and refetch data
    apiManager.invalidateCache('/goals');
    apiManager.invalidateCache('/goals/stats');
    await refetch();
    setShowSavingsModal(false);
    setSelectedGoal(null);
  };

  const filteredGoals = goals.filter(goal => {
    const matchesStatus = filterStatus === 'all' || goal.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || goal.category === filterCategory;
    const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         goal.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  const sortedGoals = [...filteredGoals].sort((a, b) => {
    switch (sortBy) {
      case 'progress':
        return b.progress - a.progress;
      case 'target_amount':
        return parseFloat(b.target_amount) - parseFloat(a.target_amount);
      case 'target_date':
        return new Date(a.target_date) - new Date(b.target_date);
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Financial Goals
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your savings goals and build your financial future
          </p>
        </div>
        <button
          onClick={handleCreateGoal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* Statistics */}
      {stats && <GoalStats stats={stats} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search goals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Categories</option>
          <option value="emergency_fund">Emergency Fund</option>
          <option value="vacation">Vacation</option>
          <option value="house">House</option>
          <option value="car">Car</option>
          <option value="education">Education</option>
          <option value="retirement">Retirement</option>
          <option value="debt_payoff">Debt Payoff</option>
          <option value="other">Other</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="created_at">Newest First</option>
          <option value="progress">Progress</option>
          <option value="target_amount">Target Amount</option>
          <option value="target_date">Target Date</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      {/* Goals Grid */}
      {sortedGoals.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No goals found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {filterStatus === 'all' && filterCategory === 'all' && !searchTerm
              ? 'Start by creating your first financial goal!'
              : 'Try adjusting your filters or search terms.'}
          </p>
          {filterStatus === 'all' && filterCategory === 'all' && !searchTerm && (
            <button
              onClick={handleCreateGoal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Goal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              categoryIcons={categoryIcons}
              statusColors={statusColors}
              statusIcons={statusIcons}
              onEdit={handleEditGoal}
              onDelete={handleDeleteGoal}
              onAddSavings={handleAddSavings}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showGoalModal && (
        <GoalModal
          goal={selectedGoal}
          onClose={() => {
            setShowGoalModal(false);
            setSelectedGoal(null);
          }}
          onSuccess={handleGoalSuccess}
        />
      )}

      {showSavingsModal && selectedGoal && (
        <SavingsModal
          goal={selectedGoal}
          onClose={() => {
            setShowSavingsModal(false);
            setSelectedGoal(null);
          }}
          onSuccess={handleSavingsSuccess}
        />
      )}
    </div>
  );
};

export default Goals;