import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useBatchApiData } from '../../hooks/useApiData';
import apiManager from '../../services/apiManager';
import SplitExpenseModal from './SplitExpenseModal';
import SplitGroupModal from './SplitGroupModal';
import SplitSummary from './SplitSummary';
import toast from 'react-hot-toast';

const Splits = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [preSelectedExpenseId, setPreSelectedExpenseId] = useState(null);

  // Use batch API data loading for splits data
  const {
    data,
    loading,
    error,
    refetch
  } = useBatchApiData([
    { key: 'splits', url: '/splits' },
    { key: 'groups', url: '/splits/groups' },
    { key: 'summary', url: '/splits/summary' }
  ]);

  const splits = data?.splits?.splits || [];
  const groups = data?.groups || [];
  const summary = data?.summary || null;

  useEffect(() => {
    // Check for expense parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const expenseId = urlParams.get('expense');
    if (expenseId) {
      setPreSelectedExpenseId(expenseId);
      setShowSplitModal(true);
      // Clean up URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Handle errors with specific messaging for rate limiting
  useEffect(() => {
    if (error) {
      let errorMessage = 'Failed to load splits data';
      
      if (error.message?.includes('429') || error.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage);
    }
  }, [error]);

  const updateSplitStatus = async (splitId, status) => {
    try {
      await apiManager.patch(`/splits/${splitId}/status`, { status });
      
      // Invalidate cache and refetch data
      apiManager.invalidateCache('/splits');
      apiManager.invalidateCache('/splits/summary');
      await refetch();
      
      toast.success(`Split status updated to ${status}`);
    } catch (error) {
      console.error('Error updating split status:', error);
      
      let errorMessage = 'Failed to update split status';
      if (error.message?.includes('429') || error.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }
      
      toast.error(errorMessage);
    }
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setShowGroupModal(true);
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!window.confirm(`Are you sure you want to delete the group "${groupName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiManager.delete(`/splits/groups/${groupId}`);
      
      // Invalidate cache and refetch data
      apiManager.invalidateCache('/splits/groups');
      await refetch();
      
      toast.success('Group deleted successfully');
    } catch (error) {
      console.error('Error deleting group:', error);
      
      let errorMessage = 'Failed to delete group';
      if (error.message?.includes('409')) {
        errorMessage = 'Cannot delete group with active splits. Please resolve all splits first.';
      } else if (error.message?.includes('429') || error.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }
      
      toast.error(errorMessage);
    }
  };

  const handleGroupModalClose = () => {
    setShowGroupModal(false);
    setEditingGroup(null);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'accepted':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'declined':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'declined':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const filteredSplits = splits.filter(split => {
    const matchesStatus = filterStatus === 'all' || split.status === filterStatus;
    const matchesSearch = split.Expense?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         split.participant_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
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
            Split Expenses
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage shared expenses and track who owes what
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGroupModal(true)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            New Group
          </button>
          <button
            onClick={() => setShowSplitModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Split Expense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: DollarSign },
            { id: 'splits', label: 'All Splits', icon: Users },
            { id: 'groups', label: 'Groups', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'splits' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search splits..."
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
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="paid">Paid</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          {/* Splits List */}
          <div className="space-y-3">
            {filteredSplits.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No splits found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {filterStatus === 'all' ? 'Start by splitting an expense with friends!' : `No ${filterStatus} splits found.`}
                </p>
              </div>
            ) : (
              filteredSplits.map((split) => (
                <motion.div
                  key={split.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(split.status)}
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {split.Expense?.description || 'Unknown Expense'}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(split.status)}`}>
                          {split.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Participant: {split.participant_name}</span>
                        <span>Amount: ${split.amount}</span>
                        <span>Type: {split.split_type}</span>
                      </div>
                    </div>
                    {split.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateSplitStatus(split.id, 'accepted')}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => updateSplitStatus(split.id, 'declined')}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {split.status === 'accepted' && (
                      <button
                        onClick={() => updateSplitStatus(split.id, 'paid')}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Mark as Paid
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No groups yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create a group to organize splits with the same people
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {group.name}
                    </h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditGroup(group)}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Edit group"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {group.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {group.members?.length || 0} members
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${group.total_expenses || 0}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'overview' && summary && (
        <div className="space-y-6">
          <SplitSummary summary={summary} detailed />
          
          {/* Recent Activity */}
          <div className={`p-6 rounded-lg border ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {splits.slice(0, 5).map((split) => (
                <div key={split.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(split.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {split.Expense?.description}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {split.participant_name}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    ${split.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showSplitModal && (
        <SplitExpenseModal
          onClose={() => {
            setShowSplitModal(false);
            setPreSelectedExpenseId(null);
          }}
          onSuccess={async () => {
            // Invalidate cache and refetch data
            apiManager.invalidateCache('/splits');
            apiManager.invalidateCache('/splits/summary');
            await refetch();
            setShowSplitModal(false);
            setPreSelectedExpenseId(null);
          }}
          groups={groups}
          preSelectedExpenseId={preSelectedExpenseId}
        />
      )}

      {showGroupModal && (
        <SplitGroupModal
          onClose={handleGroupModalClose}
          onSuccess={async () => {
            // Invalidate cache and refetch data
            apiManager.invalidateCache('/splits/groups');
            await refetch();
            handleGroupModalClose();
          }}
          editGroup={editingGroup}
        />
      )}
    </div>
  );
};

export default Splits;