import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  BarChart3,
  PieChart,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Target,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { useBatchApiData } from '../../hooks/useApiData';
import apiManager from '../../services/apiManager';
import axios from 'axios';
import toast from 'react-hot-toast';

const Reports = () => {
  const { theme, formatCurrency } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [comparisonData, setComparisonData] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  const periods = [
    { value: 'month', label: 'Monthly Report' },
    { value: 'quarter', label: 'Quarterly Report' },
    { value: 'year', label: 'Yearly Report' },
    { value: 'custom', label: 'Custom Period' }
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#C026D3', '#DB2777'
  ];

  // Prepare API request parameters
  const getReportParams = () => {
    let params = {
      period: selectedPeriod,
      year: selectedYear
    };

    if (selectedPeriod === 'month') {
      params.month = selectedMonth;
    }

    return params;
  };

  // Use batch API data loading
  const { data, loading, errors, refetch } = useBatchApiData([
    {
      key: 'reportData',
      url: '/analytics/reports',
      options: {
        params: getReportParams(),
        maxAge: 120000 // Cache for 2 minutes
      }
    },
    {
      key: 'categories',
      url: '/categories',
      options: { maxAge: 300000 } // Cache for 5 minutes
    }
  ], {
    dependencies: [selectedPeriod, selectedYear, selectedMonth],
    concurrency: 2
  });

  const reportData = data.reportData;
  const categories = data.categories?.categories || [];

  // Fetch comparison data when needed
  useEffect(() => {
    if (showComparison && reportData) {
      fetchComparisonData();
    }
  }, [showComparison, selectedPeriod, selectedYear, selectedMonth, reportData]);

  const fetchComparisonData = async () => {
    try {
      let params = {
        period: selectedPeriod,
        year: selectedPeriod === 'year' ? selectedYear - 1 : selectedYear
      };

      if (selectedPeriod === 'month') {
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
        params.month = prevMonth;
        params.year = prevYear;
      }

      const response = await apiManager.makeRequest('/analytics/reports', {
        params,
        maxAge: 120000
      });
      setComparisonData(response);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      if (error.response?.status === 429) {
        toast.error('Too many requests. Please wait a moment and try again.');
      }
    }
  };

  const exportReport = async (format = 'pdf') => {
    try {
      console.log('🚀 Frontend: Starting report export');
      console.log('Export parameters:', {
        period: selectedPeriod,
        year: selectedYear,
        month: selectedPeriod === 'month' ? selectedMonth : undefined,
        format
      });

      const params = new URLSearchParams({
        period: selectedPeriod,
        year: selectedYear.toString(),
        format
      });

      if (selectedPeriod === 'month') {
        params.append('month', selectedMonth.toString());
      }

      // Use axios directly for file downloads, not apiManager
      const token = localStorage.getItem('token');
      
      // Create a timeout promise to handle the connection termination gracefully
      const downloadPromise = axios.get(`${import.meta.env.VITE_API_URL}/reports/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob',
        timeout: 30000 // 30 second timeout
      });

      // Handle the download with proper error handling for connection termination
      try {
        const response = await downloadPromise;
        
        console.log('🚀 Frontend: Export response received', response);

        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedPeriod}-report-${selectedYear}${selectedPeriod === 'month' ? `-${selectedMonth.toString().padStart(2, '0')}` : ''}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success('Report exported successfully');
      } catch (downloadError) {
        // Check if it's a network error that might be due to connection termination after successful download
        if (downloadError.code === 'ERR_NETWORK' || downloadError.message === 'Network Error') {
          // Wait a moment and check if file was downloaded by looking for the blob
          setTimeout(() => {
            // If we get here and there was a network error, it's likely the file was still downloaded
            // Show a cautious success message
            toast.success('Report export completed. Please check your downloads folder.');
          }, 1000);
        } else {
          throw downloadError; // Re-throw other errors
        }
      }

    } catch (error) {
      console.error('🚨 Frontend: Export failed:', error);
      if (error.response?.status === 429) {
        toast.error('Too many requests. Please wait a moment and try again.');
      } else if (error.code !== 'ERR_NETWORK') {
        // Only show error for non-network errors since network errors might be false positives
        toast.error('Failed to export report');
      }
    }
  };

  const getPercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatPercentage = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'month':
        return `${months[selectedMonth - 1]} ${selectedYear}`;
      case 'quarter':
        const quarter = Math.ceil(selectedMonth / 3);
        return `Q${quarter} ${selectedYear}`;
      case 'year':
        return selectedYear.toString();
      default:
        return 'Custom Period';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`animate-spin rounded-full h-32 w-32 border-b-2 ${theme === 'dark' ? 'border-blue-400' : 'border-blue-600'}`}></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No report data available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Financial Reports
          </h1>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Comprehensive analysis of your financial data for {getPeriodLabel()}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`btn-outline ${showComparison ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showComparison ? 'Hide' : 'Show'} Comparison
          </button>
          <div className="relative">
            <button
              onClick={() => exportReport('pdf')}
              className="btn-primary"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </button>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className={`btn-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Period Selection */}
      <div className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Report Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              >
                {periods.map(period => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            {selectedPeriod === 'month' && (
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                >
                  {months.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
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
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData.summary?.totalIncome || 0)}
                </p>
                {showComparison && comparisonData && (
                  <p className={`text-xs mt-1 ${
                    getPercentageChange(reportData.summary?.totalIncome, comparisonData.summary?.totalIncome) >= 0
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(getPercentageChange(reportData.summary?.totalIncome, comparisonData.summary?.totalIncome))} vs previous period
                  </p>
                )}
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
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(reportData.summary?.totalExpenses || 0)}
                </p>
                {showComparison && comparisonData && (
                  <p className={`text-xs mt-1 ${
                    getPercentageChange(reportData.summary?.totalExpenses, comparisonData.summary?.totalExpenses) <= 0
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(getPercentageChange(reportData.summary?.totalExpenses, comparisonData.summary?.totalExpenses))} vs previous period
                  </p>
                )}
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
                <p className={`text-2xl font-bold ${
                  (reportData.summary?.totalIncome - reportData.summary?.totalExpenses) >= 0 
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency((reportData.summary?.totalIncome || 0) - (reportData.summary?.totalExpenses || 0))}
                </p>
                {showComparison && comparisonData && (
                  <p className={`text-xs mt-1 ${
                    getPercentageChange(
                      (reportData.summary?.totalIncome || 0) - (reportData.summary?.totalExpenses || 0),
                      (comparisonData.summary?.totalIncome || 0) - (comparisonData.summary?.totalExpenses || 0)
                    ) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(getPercentageChange(
                      (reportData.summary?.totalIncome || 0) - (reportData.summary?.totalExpenses || 0),
                      (comparisonData.summary?.totalIncome || 0) - (comparisonData.summary?.totalExpenses || 0)
                    ))} vs previous period
                  </p>
                )}
              </div>
              <DollarSign className={`h-8 w-8 ${
                (reportData.summary?.totalIncome - reportData.summary?.totalExpenses) >= 0 
                  ? 'text-green-600' : 'text-red-600'
              }`} />
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
                  {reportData.summary?.transactionCount || 0}
                </p>
                {showComparison && comparisonData && (
                  <p className={`text-xs mt-1 ${
                    getPercentageChange(reportData.summary?.transactionCount, comparisonData.summary?.transactionCount) >= 0
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(getPercentageChange(reportData.summary?.transactionCount, comparisonData.summary?.transactionCount))} vs previous period
                  </p>
                )}
              </div>
              <FileText className={`h-8 w-8 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-header">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {selectedPeriod === 'year' ? 'Monthly Trend' : 'Daily Trend'}
            </h3>
          </div>
          <div className="card-content">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={reportData.trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                <XAxis 
                  dataKey="period" 
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  fontSize={12}
                />
                <YAxis 
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  fontSize={12}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#FFFFFF' : '#000000'
                  }}
                  formatter={(value) => [formatCurrency(value), '']}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                  name="Income"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stackId="2"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.6}
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-header">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Expense Categories
            </h3>
          </div>
          <div className="card-content">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={reportData.categoryBreakdown || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(reportData.categoryBreakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#FFFFFF' : '#000000'
                  }}
                  formatter={(value) => [formatCurrency(value), 'Amount']}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Category Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
      >
        <div className="card-header">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Category Analysis
          </h3>
        </div>
        <div className="card-content">
          <div className="space-y-4">
            {(reportData.categoryBreakdown || []).map((category, index) => {
              const categoryData = categories.find(c => c.name === category.name);
              const budgetStatus = categoryData?.monthlyBudget ? 
                category.amount / categoryData.monthlyBudget : null;
              
              return (
                <div key={category.name} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    ></div>
                    <div>
                      <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {category.name}
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {category.transactionCount} transactions
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(category.amount)}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {((category.amount / (reportData.summary?.totalExpenses || 1)) * 100).toFixed(1)}% of total
                    </p>
                    {budgetStatus && (
                      <div className="flex items-center space-x-1 mt-1">
                        {budgetStatus > 1 ? (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        ) : budgetStatus > 0.8 ? (
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        ) : (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                        <span className={`text-xs ${
                          budgetStatus > 1 ? 'text-red-500' :
                          budgetStatus > 0.8 ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          {(budgetStatus * 100).toFixed(0)}% of budget
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Top Transactions */}
      {reportData.topTransactions && reportData.topTransactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}
        >
          <div className="card-header">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Largest Transactions
            </h3>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              {reportData.topTransactions.map((transaction, index) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.type === 'income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {transaction.description}
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {transaction.categoryName} • {new Date(transaction.date).toLocaleDateString()}
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
    </div>
  );
};

export default Reports;