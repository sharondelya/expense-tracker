import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, DollarSign, PiggyBank, TrendingUp } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SavingsModal = ({ goal, onClose, onSuccess }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    if (transactionType === 'withdrawal' && parseFloat(amount) > parseFloat(goal.current_amount)) {
      toast.error('Withdrawal amount cannot exceed current savings');
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Frontend: Starting savings transaction');
      console.log('Goal ID:', goal.id);
      console.log('Transaction type:', transactionType);
      console.log('Amount:', amount);
      console.log('Description:', description);

      const endpoint = transactionType === 'deposit' ? 'savings' : 'withdraw';
      const transactionData = {
        amount: parseFloat(amount),
        description: description.trim() || undefined
      };

      console.log('🚀 Frontend: API call data:', transactionData);

      const response = await api.post(`/goals/${goal.id}/${endpoint}`, transactionData);
      
      console.log('🚀 Frontend: API Response:', response);
      
      toast.success(response.data?.message || `${transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'} completed successfully!`);
      onSuccess();
    } catch (error) {
      console.error('🚨 Frontend: Error processing transaction:', error);
      console.error('🚨 Frontend: Error response:', error.response?.data);
      toast.error(error.response?.data?.error || `Failed to ${transactionType === 'deposit' ? 'add savings' : 'withdraw funds'}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateNewAmount = () => {
    if (!amount) return parseFloat(goal.current_amount);
    const currentAmount = parseFloat(goal.current_amount);
    const transactionAmount = parseFloat(amount);
    
    if (transactionType === 'deposit') {
      return currentAmount + transactionAmount;
    } else {
      return Math.max(0, currentAmount - transactionAmount);
    }
  };

  const calculateNewProgress = () => {
    const newAmount = calculateNewAmount();
    return Math.min((newAmount / parseFloat(goal.target_amount)) * 100, 100);
  };

  const newAmount = calculateNewAmount();
  const newProgress = calculateNewProgress();
  const remainingAmount = Math.max(0, parseFloat(goal.target_amount) - newAmount);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-md rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <PiggyBank className="w-5 h-5" />
              Manage Savings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Goal Info */}
            <div className={`p-4 rounded-lg mb-6 ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                {goal.title}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Current:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(goal.current_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Target:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(goal.target_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Progress:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {goal.progress.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionType('deposit')}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      transactionType === 'deposit'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Plus className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-sm font-medium">Add Savings</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionType('withdrawal')}
                    disabled={parseFloat(goal.current_amount) === 0}
                    className={`p-3 rounded-lg border text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      transactionType === 'withdrawal'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Minus className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-sm font-medium">Withdraw</div>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    max={transactionType === 'withdrawal' ? goal.current_amount : undefined}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                {transactionType === 'withdrawal' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximum: {formatCurrency(goal.current_amount)}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Reason for ${transactionType}...`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Preview */}
              {amount && parseFloat(amount) > 0 && (
                <div className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Preview</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">New Amount:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(newAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">New Progress:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {newProgress.toFixed(1)}%
                      </span>
                    </div>
                    {transactionType === 'deposit' && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(remainingAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          newProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(newProgress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {newProgress >= 100 && (
                    <div className="mt-2 text-center text-green-600 dark:text-green-400 font-medium text-sm">
                      🎉 Goal will be completed!
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    transactionType === 'deposit'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading 
                    ? 'Processing...' 
                    : transactionType === 'deposit' 
                      ? 'Add Savings' 
                      : 'Withdraw Funds'
                  }
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SavingsModal;