import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  DollarSign,
  Repeat,
  Play,
  Pause,
  Filter,
  Search
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useApiData, useBatchApiData } from '../../hooks/useApiData';
import apiManager from '../../services/apiManager';
import api from '../../services/api';
import toast from 'react-hot-toast';

const RecurringTransactions = () => {
  const { theme, formatCurrency } = useTheme();
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [upcomingTransactions, setUpcomingTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    description: '',
    categoryId: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    totalOccurrences: '',
    dayOfMonth: '',
    dayOfWeek: '',
    monthOfYear: '',
    notes: ''
  });

  const frequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
  ];


  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Use batch API data loading for initial data
  const { data, loading, error, refetch } = useBatchApiData([
    {
      key: 'recurringTransactions',
      url: '/recurring-transactions',
      options: { maxAge: 60000 } // Cache for 1 minute
    },
    {
      key: 'upcomingTransactions',
      url: '/recurring-transactions/upcoming',
      options: { maxAge: 30000 } // Cache for 30 seconds
    },
    {
      key: 'categories',
      url: '/categories',
      options: { maxAge: 300000 } // Cache for 5 minutes
    }
  ], {
    concurrency: 2
  });

  // Extract data from batch response
  const recurringTransactionsData = data.recurringTransactions?.recurringTransactions || [];
  const upcomingTransactionsData = data.upcomingTransactions || [];
  const categoriesData = data.categories?.categories || [];

  // Update local state when data changes
  useEffect(() => {
    if (recurringTransactionsData.length > 0 || !loading) {
      setRecurringTransactions(recurringTransactionsData);
    }
  }, [recurringTransactionsData, loading]);

  useEffect(() => {
    if (upcomingTransactionsData.length > 0 || !loading) {
      setUpcomingTransactions(upcomingTransactionsData);
    }
  }, [upcomingTransactionsData, loading]);

  useEffect(() => {
    if (categoriesData.length > 0 || !loading) {
      setCategories(categoriesData);
    }
  }, [categoriesData, loading]);

  // Handle errors with specific messaging for rate limiting
  useEffect(() => {
    if (error) {
      let errorMessage = 'Failed to load recurring transactions data';
      
      if (error.message?.includes('429') || error.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage);
    }
  }, [error]);

  // Helper function to force refresh all data
  const forceRefreshData = async () => {
    try {
      // Clear cache for recurring transactions endpoints
      apiManager.invalidateCache('/recurring-transactions');
      apiManager.invalidateCache('/recurring-transactions/upcoming');
      
      // Trigger refetch of all data
      await refetch();
      
      // Update local state immediately to ensure UI reflects changes
      const freshData = await Promise.all([
        api.get('/recurring-transactions'),
        api.get('/recurring-transactions/upcoming'),
        api.get('/categories')
      ]);
      
      setRecurringTransactions(freshData[0].data.recurringTransactions || []);
      setUpcomingTransactions(freshData[1].data || []);
      setCategories(freshData[2].data.categories || []);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('🚀 Frontend: Starting recurring transaction submission');
      console.log('Form data before processing:', formData);
      
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        dayOfMonth: formData.dayOfMonth ? parseInt(formData.dayOfMonth) : null,
        dayOfWeek: formData.dayOfWeek !== '' ? parseInt(formData.dayOfWeek) : null,
        monthOfYear: formData.monthOfYear ? parseInt(formData.monthOfYear) : null,
        totalOccurrences: formData.totalOccurrences ? parseInt(formData.totalOccurrences) : null
      };
      
      console.log('🚀 Frontend: Processed submit data:', submitData);

      if (editingTransaction) {
        console.log('🚀 Frontend: Updating existing transaction');
        await api.put(`/recurring-transactions/${editingTransaction.id}`, submitData);
        toast.success('Recurring transaction updated successfully');
      } else {
        console.log('🚀 Frontend: Creating new transaction');
        const response = await api.post('/recurring-transactions', submitData);
        console.log('🚀 Frontend: API Response:', response);
        toast.success('Recurring transaction created successfully');
      }

      setShowModal(false);
      setEditingTransaction(null);
      resetForm();
      
      // Force refresh all data to show changes immediately
      await forceRefreshData();
    } catch (error) {
      console.error('🚨 Frontend: Error saving recurring transaction:', error);
      console.error('🚨 Frontend: Error response:', error.response?.data);
      if (error.response?.status === 429) {
        toast.error('Too many requests. Please wait a moment and try again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to save recurring transaction');
      }
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      categoryId: transaction.categoryId?.toString() || '',
      frequency: transaction.frequency,
      startDate: transaction.startDate.split('T')[0],
      endDate: transaction.endDate ? transaction.endDate.split('T')[0] : '',
      totalOccurrences: transaction.totalOccurrences?.toString() || '',
      dayOfMonth: transaction.dayOfMonth?.toString() || '',
      dayOfWeek: transaction.dayOfWeek?.toString() || '',
      monthOfYear: transaction.monthOfYear?.toString() || '',
      notes: transaction.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this recurring transaction?')) {
      try {
        await api.delete(`/recurring-transactions/${id}`);
        toast.success('Recurring transaction deleted successfully');
        
        // Force refresh all data to show changes immediately
        await forceRefreshData();
      } catch (error) {
        console.error('Error deleting recurring transaction:', error);
        if (error.response?.status === 429) {
          toast.error('Too many requests. Please wait a moment and try again.');
        } else {
          toast.error('Failed to delete recurring transaction');
        }
      }
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await api.put(`/recurring-transactions/${id}`, { isActive: !isActive });
      toast.success(`Recurring transaction ${!isActive ? 'activated' : 'paused'}`);
      
      // Force refresh all data to show changes immediately
      await forceRefreshData();
    } catch (error) {
      console.error('Error toggling recurring transaction:', error);
      if (error.response?.status === 429) {
        toast.error('Too many requests. Please wait a moment and try again.');
      } else {
        toast.error('Failed to update recurring transaction');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: '',
      description: '',
      categoryId: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      totalOccurrences: '',
      dayOfMonth: '',
      dayOfWeek: '',
      monthOfYear: '',
      notes: ''
    });
  };

  const filteredTransactions = recurringTransactions.filter(transaction => {
    const matchesFilter = filter === 'all' || 
      (filter === 'active' && transaction.isActive) ||
      (filter === 'inactive' && !transaction.isActive) ||
      (filter === 'income' && transaction.type === 'income') ||
      (filter === 'expense' && transaction.type === 'expense');
    
    const categoryName = transaction.category?.name || 'Uncategorized';
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getFrequencyIcon = (frequency) => {
    switch (frequency) {
      case 'daily': return <Clock className="h-4 w-4" />;
      case 'weekly': return <Calendar className="h-4 w-4" />;
      case 'monthly': return <Repeat className="h-4 w-4" />;
      case 'quarterly': return <Repeat className="h-4 w-4" />;
      case 'yearly': return <Calendar className="h-4 w-4" />;
      default: return <Repeat className="h-4 w-4" />;
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
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Recurring Transactions
          </h1>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Manage your recurring income and expenses
          </p>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setEditingTransaction(null);
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Recurring Transaction
        </button>
      </div>

      {/* Upcoming Transactions */}
      {upcomingTransactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-header">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Upcoming Transactions (Next 30 Days)
            </h3>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              {upcomingTransactions.slice(0, 5).map((transaction, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 ${transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} rounded-full`}>
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {transaction.description}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {transaction.category?.name || 'Uncategorized'} • {new Date(transaction.nextDueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`input-field pl-10 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : ''}`}
            />
          </div>
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={`input-field ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : ''}`}
        >
          <option value="all">All Transactions</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
        </select>
      </div>

      {/* Recurring Transactions List */}
      <div className="grid gap-4">
        {filteredTransactions.map((transaction, index) => (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''} ${!transaction.isActive ? 'opacity-60' : ''}`}
          >
            <div className="card-content">
              {/* Mobile Layout (< md screens) */}
              <div className="md:hidden">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 ${transaction.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'} rounded-full`}>
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {transaction.description}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          transaction.type === 'income'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {transaction.type}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          transaction.isActive
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                        }`}>
                          {transaction.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <span className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-4 text-sm">
                    <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {transaction.category?.name || 'Uncategorized'}
                    </span>
                    <div className="flex items-center space-x-1">
                      {getFrequencyIcon(transaction.frequency)}
                      <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {transaction.frequency}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      Next: {new Date(transaction.nextDueDate).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {transaction.notes && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {transaction.notes}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleActive(transaction.id, transaction.isActive)}
                        className={`p-2 rounded-full ${transaction.isActive ? 
                          theme === 'dark' ? 'text-green-400 hover:bg-gray-700' : 'text-green-600 hover:bg-green-100'
                          : theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={transaction.isActive ? 'Pause' : 'Resume'}
                      >
                        {transaction.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      
                      <button
                        onClick={() => handleEdit(transaction)}
                        className={`p-2 rounded-full ${theme === 'dark' ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-blue-100'}`}
                        title="Edit Transaction"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className={`p-2 rounded-full ${theme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-100'}`}
                        title="Delete Transaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout (md+ screens) */}
              <div className="hidden md:block">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 ${transaction.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'} rounded-full`}>
                      <DollarSign className="h-6 w-6" />
                    </div>
                    
                    <div>
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {transaction.description}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {transaction.category?.name || 'Uncategorized'}
                        </span>
                        <div className="flex items-center space-x-1">
                          {getFrequencyIcon(transaction.frequency)}
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {transaction.frequency}
                          </span>
                        </div>
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          Next: {new Date(transaction.nextDueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`text-xl font-bold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleActive(transaction.id, transaction.isActive)}
                        className={`p-2 rounded-full ${transaction.isActive ? 
                          theme === 'dark' ? 'text-green-400 hover:bg-gray-700' : 'text-green-600 hover:bg-green-100'
                          : theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={transaction.isActive ? 'Pause' : 'Resume'}
                      >
                        {transaction.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      
                      <button
                        onClick={() => handleEdit(transaction)}
                        className={`p-2 rounded-full ${theme === 'dark' ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-blue-100'}`}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className={`p-2 rounded-full ${theme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-100'}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {transaction.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {transaction.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        
        {filteredTransactions.length === 0 && (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recurring transactions found</p>
            <p className="text-sm mt-1">Create your first recurring transaction to get started</p>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto`}
          >
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {editingTransaction ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    required
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Category
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  >
                    <option value="">Select Category (Optional)</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    required
                  >
                    {frequencies.map(freq => (
                      <option key={freq.value} value={freq.value}>{freq.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    required
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  />
                </div>
              </div>
              
              {/* Frequency-specific fields */}
              {formData.frequency === 'weekly' && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Day of Week
                  </label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                    className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  >
                    <option value="">Select Day</option>
                    {daysOfWeek.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {(formData.frequency === 'monthly' || formData.frequency === 'quarterly') && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Day of Month (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                    className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  />
                </div>
              )}
              
              {formData.frequency === 'yearly' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Month
                    </label>
                    <select
                      value={formData.monthOfYear}
                      onChange={(e) => setFormData({ ...formData, monthOfYear: e.target.value })}
                      className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    >
                      <option value="">Select Month</option>
                      {months.map(month => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Day of Month (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dayOfMonth}
                      onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                      className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Total Occurrences (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.totalOccurrences}
                  onChange={(e) => setFormData({ ...formData, totalOccurrences: e.target.value })}
                  className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  placeholder="Leave empty for unlimited"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  rows="3"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTransaction(null);
                    resetForm();
                  }}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingTransaction ? 'Update' : 'Create'} Transaction
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RecurringTransactions;