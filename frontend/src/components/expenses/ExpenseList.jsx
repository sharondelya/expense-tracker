import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Filter,
  Search,
  Download,
  Calendar,
  DollarSign,
  Tag,
  SortAsc,
  SortDesc,
  X,
  ChevronDown,
  FileText,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Camera,
  Image,
  Upload,
  Users
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ReceiptUpload from '../receipts/ReceiptUpload';
import ReceiptViewer from '../receipts/ReceiptViewer';

const ExpenseList = () => {
  const { theme, formatCurrency } = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [showReceiptViewer, setShowReceiptViewer] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    sortBy: 'date',
    sortOrder: 'desc',
    tags: []
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    description: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    tags: [],
    paymentMethod: 'card'
  });

  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    netAmount: 0,
    transactionCount: 0
  });

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'amount', label: 'Amount' },
    { value: 'description', label: 'Description' },
    { value: 'category', label: 'Category' }
  ];

  const quickFilters = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Last 30 Days', value: '30days' },
    { label: 'This Year', value: 'year' }
  ];

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [filters, pagination.page]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => 
            value !== '' && value !== null && 
            (Array.isArray(value) ? value.length > 0 : true)
          )
        )
      });

      if (filters.tags.length > 0) {
        params.set('tags', filters.tags.join(','));
      }

      const response = await api.get(`/expenses?${params}`);
      const data = response.data;
      
      setExpenses(data.expenses || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0
      }));
      
      // Calculate stats
      const totalExpenses = data.expenses
        ?.filter(e => e.type === 'expense')
        ?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
      
      const totalIncome = data.expenses
        ?.filter(e => e.type === 'income')
        ?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

      setStats({
        totalExpenses,
        totalIncome,
        netAmount: totalIncome - totalExpenses,
        transactionCount: data.expenses?.length || 0
      });
      
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleQuickFilter = (period) => {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'today':
        startDate = endDate = now.toISOString().split('T')[0];
        break;
      case 'week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
        break;
      case '30days':
        startDate = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setFilters(prev => ({ ...prev, startDate, endDate }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: '',
      categoryId: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      sortBy: 'date',
      sortOrder: 'desc',
      tags: []
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate categoryId is selected
      if (!formData.categoryId) {
        toast.error('Please select a category');
        return;
      }

      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      console.log('Submitting expense data:', submitData);

      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, submitData);
        toast.success('Expense updated successfully');
      } else {
        await api.post('/expenses', submitData);
        toast.success('Expense added successfully');
      }

      setShowForm(false);
      setEditingExpense(null);
      resetForm();
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save expense');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      type: expense.type,
      amount: expense.amount.toString(),
      description: expense.description,
      categoryId: expense.categoryId || '',
      date: expense.date.split('T')[0],
      notes: expense.notes || '',
      tags: expense.tags || [],
      paymentMethod: expense.paymentMethod || 'card'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await api.delete(`/expenses/${id}`);
        toast.success('Transaction deleted successfully');
        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        toast.error('Failed to delete transaction');
      }
    }
  };

  const exportExpenses = async (format = 'csv') => {
    setShowExportMenu(false); // Close dropdown immediately
    
    try {
      const params = new URLSearchParams(filters);
      
      // Filter out empty parameters to avoid backend issues
      const filteredParams = new URLSearchParams();
      for (const [key, value] of params) {
        if (value && value.trim() !== '') {
          filteredParams.append(key, value);
        }
      }
      
      // For PDF downloads, use a simple window.open approach to avoid fetch issues
      if (format === 'pdf') {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          toast.error('Authentication required - please log in again');
          return;
        }

        // Construct the base URL
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const exportUrl = `${baseURL}/expenses/export`;

        // Create a temporary form to submit the download request
        const form = document.createElement('form');
        form.method = 'GET';
        form.action = exportUrl;
        form.target = '_blank';
        form.style.display = 'none';
        
        // Add format as hidden input
        const formatInput = document.createElement('input');
        formatInput.type = 'hidden';
        formatInput.name = 'format';
        formatInput.value = format;
        form.appendChild(formatInput);
        
        // Add token as hidden input for authentication
        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = 'authToken';
        tokenInput.value = token;
        form.appendChild(tokenInput);
        
        // Add all filter parameters as hidden inputs
        for (const [key, value] of filteredParams) {
          if (value && value.trim() !== '') {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
          }
        }
        
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        
        // Show success message after a brief delay
        setTimeout(() => {
          toast.success('PDF export started - download should begin shortly');
        }, 500);
        
        return;
      } else {
        // Use axios for CSV downloads (they work fine)
        const response = await api.get(`/expenses/export?format=${format}&${filteredParams}`, {
          responseType: 'blob',
          timeout: 30000,
        });
        
        if (response.data && response.data.size > 0) {
          const blob = new Blob([response.data]);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `expenses-${new Date().toISOString().split('T')[0]}.${format}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          toast.success(`${format.toUpperCase()} export completed successfully`);
        } else {
          throw new Error('Empty response received');
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      
      // More specific error messages for actual errors
      if (error.code === 'ECONNABORTED') {
        toast.error('Export timeout - please try with a smaller date range');
      } else if (error.response?.status === 500) {
        toast.error('Server error during export - please try again');
      } else if (error.response?.status === 404) {
        toast.error('Export endpoint not found');
      } else if (error.response?.status === 401) {
        toast.error('Authentication required - please log in again');
      } else {
        toast.error('Failed to export data - please try again');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: '',
      description: '',
      categoryId: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      tags: [],
      paymentMethod: 'card'
    });
  };

  const getCategoryIcon = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
        style={{ backgroundColor: category.color }}
      >
        {category.name.charAt(0).toUpperCase()}
      </div>
    ) : (
      <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-medium">
        ?
      </div>
    );
  };

  const handleReceiptUpload = (expenseId) => {
    setSelectedExpenseId(expenseId);
    setShowReceiptUpload(true);
  };

  const handleReceiptView = (expenseId) => {
    setSelectedExpenseId(expenseId);
    setShowReceiptViewer(true);
  };

  const handleReceiptUploadSuccess = () => {
    fetchExpenses(); // Refresh the list to show receipt indicator
  };

  const handleReceiptDelete = () => {
    fetchExpenses(); // Refresh the list to remove receipt indicator
  };

  const handleSplitExpense = (expenseId) => {
    // Navigate to splits page with the expense pre-selected
    window.location.href = `/splits?expense=${expenseId}`;
  };

  if (loading && expenses.length === 0) {
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
            Transactions
          </h1>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Track and manage your income and expenses
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            {showExportMenu && (
              <div className={`absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-48 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-20`}>
                <button
                  onClick={() => exportExpenses('csv')}
                  className={`w-full text-left px-4 py-2 hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-t-lg transition-colors`}
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => exportExpenses('pdf')}
                  className={`w-full text-left px-4 py-2 hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded-b-lg transition-colors`}
                >
                  Export as PDF
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingExpense(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Total Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalIncome)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
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
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
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
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Net Amount</p>
                <p className={`text-2xl font-bold ${stats.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.netAmount)}
                </p>
              </div>
              <DollarSign className={`h-8 w-8 ${stats.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`} />
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
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Transactions</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.transactionCount}
                </p>
              </div>
              <FileText className={`h-8 w-8 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map(filter => (
          <button
            key={filter.value}
            onClick={() => handleQuickFilter(filter.value)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              theme === 'dark'
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
        {(filters.search || filters.type || filters.categoryId || filters.startDate || filters.endDate) && (
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-700 hover:bg-red-200"
          >
            <X className="h-3 w-3 mr-1 inline" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
      >
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className={`input-field pl-10 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
            </div>

            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
            >
              <option value="">All Types</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>

            <select
              value={filters.categoryId}
              onChange={(e) => handleFilterChange('categoryId', e.target.value)}
              className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <div className="flex space-x-2">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className={`input-field flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                className={`p-2 border rounded-lg ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              placeholder="Start Date"
            />

            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              placeholder="End Date"
            />

            <input
              type="number"
              step="0.01"
              value={filters.minAmount}
              onChange={(e) => handleFilterChange('minAmount', e.target.value)}
              className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              placeholder="Min Amount"
            />

            <input
              type="number"
              step="0.01"
              value={filters.maxAmount}
              onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
              className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              placeholder="Max Amount"
            />
          </div>
        </div>
      </motion.div>

      {/* Transaction List */}
      <div className="space-y-3">
        {expenses.length === 0 ? (
          <div className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}>
            <div className="card-content text-center py-12">
              <FileText className={`h-12 w-12 mx-auto mb-4 opacity-50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No transactions found</p>
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary mt-4"
              >
                Add your first transaction
              </button>
            </div>
          </div>
        ) : (
          expenses.map((expense, index) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''} hover:shadow-md transition-shadow`}
            >
              <div className="card-content">
                {/* Mobile Layout (< md screens) */}
                <div className="md:hidden">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getCategoryIcon(expense.categoryId)}
                      <div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {expense.description}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            expense.type === 'income'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {expense.type}
                          </span>
                          {(expense.receiptData || expense.receiptOriginalName) && (
                            <span className="flex items-center text-green-600 dark:text-green-400 text-xs">
                              <Image className="h-3 w-3 mr-1" />
                              Receipt
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <span className={`text-lg font-bold ${expense.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {expense.type === 'income' ? '+' : '-'}{formatCurrency(expense.amount)}
                    </span>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-4 text-sm">
                      <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {categories.find(c => c.id === expense.categoryId)?.name || 'Uncategorized'}
                      </span>
                      <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(expense.date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {expense.notes && (
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {expense.notes}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2">
                        {/* Receipt Actions */}
                        {(expense.receiptData || expense.receiptOriginalName) ? (
                          <button
                            onClick={() => handleReceiptView(expense.id)}
                            className={`p-2 rounded-full ${theme === 'dark' ? 'text-green-400 hover:bg-gray-700' : 'text-green-600 hover:bg-green-100'}`}
                            title="View Receipt"
                          >
                            <Image className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReceiptUpload(expense.id)}
                            className={`p-2 rounded-full ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                            title="Upload Receipt"
                          >
                            <Camera className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleEdit(expense)}
                          className={`p-2 rounded-full ${theme === 'dark' ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-blue-100'}`}
                          title="Edit Transaction"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className={`p-2 rounded-full ${theme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-100'}`}
                          title="Delete Transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout (>= md screens) */}
                <div className="hidden md:flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getCategoryIcon(expense.categoryId)}
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {expense.description}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          expense.type === 'income'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {expense.type}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm">
                        <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {categories.find(c => c.id === expense.categoryId)?.name || 'Uncategorized'}
                        </span>
                        <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                        {(expense.receiptData || expense.receiptOriginalName) && (
                          <span className="flex items-center text-green-600 dark:text-green-400">
                            <Image className="h-3 w-3 mr-1" />
                            Receipt
                          </span>
                        )}
                      </div>
                      
                      {expense.notes && (
                        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {expense.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`text-xl font-bold ${expense.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {expense.type === 'income' ? '+' : '-'}{formatCurrency(expense.amount)}
                    </span>
                    
                    <div className="flex items-center space-x-2">
                      {/* Receipt Actions */}
                      {(expense.receiptData || expense.receiptOriginalName) ? (
                        <button
                          onClick={() => handleReceiptView(expense.id)}
                          className={`p-2 rounded-full ${theme === 'dark' ? 'text-green-400 hover:bg-gray-700' : 'text-green-600 hover:bg-green-100'}`}
                          title="View Receipt"
                        >
                          <Image className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReceiptUpload(expense.id)}
                          className={`p-2 rounded-full ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                          title="Upload Receipt"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleEdit(expense)}
                        className={`p-2 rounded-full ${theme === 'dark' ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-blue-100'}`}
                        title="Edit Transaction"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className={`p-2 rounded-full ${theme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-100'}`}
                        title="Delete Transaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center space-x-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setPagination(prev => ({ ...prev, page }))}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                page === pagination.page
                  ? theme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-600 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Transaction Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto`}
            >
              <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingExpense ? 'Edit Transaction' : 'Add Transaction'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
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
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Category
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  >
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="digital_wallet">Digital Wallet</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    required
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
                      setShowForm(false);
                      setEditingExpense(null);
                      resetForm();
                    }}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingExpense ? 'Update' : 'Add'} Transaction
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Upload Modal */}
      <AnimatePresence>
        {showReceiptUpload && (
          <ReceiptUpload
            expenseId={selectedExpenseId}
            onUploadSuccess={handleReceiptUploadSuccess}
            onClose={() => {
              setShowReceiptUpload(false);
              setSelectedExpenseId(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Receipt Viewer Modal */}
      <AnimatePresence>
        {showReceiptViewer && (
          <ReceiptViewer
            expenseId={selectedExpenseId}
            onDelete={handleReceiptDelete}
            onClose={() => {
              setShowReceiptViewer(false);
              setSelectedExpenseId(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpenseList;
                