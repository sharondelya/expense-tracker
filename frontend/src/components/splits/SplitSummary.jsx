import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const SplitSummary = ({ summary, detailed = false }) => {
  const { theme } = useTheme();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getBalanceColor = (amount) => {
    if (amount > 0) return 'text-green-600 dark:text-green-400';
    if (amount < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getBalanceIcon = (amount) => {
    if (amount > 0) return <TrendingUp className="w-5 h-5" />;
    if (amount < 0) return <TrendingDown className="w-5 h-5" />;
    return <DollarSign className="w-5 h-5" />;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Owed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-lg border ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              You Owe
            </p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(summary.totalOwed)}
            </p>
          </div>
          <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
            <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
        {detailed && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {summary.owedSplits?.length || 0} pending payments
            </p>
          </div>
        )}
      </motion.div>

      {/* Total Owing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`p-6 rounded-lg border ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Owed to You
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(summary.totalOwing)}
            </p>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
        {detailed && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {summary.owingToUserSplits?.length || 0} pending receipts
            </p>
          </div>
        )}
      </motion.div>

      {/* Net Balance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`p-6 rounded-lg border ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Net Balance
            </p>
            <p className={`text-2xl font-bold ${getBalanceColor(summary.netBalance)}`}>
              {formatCurrency(Math.abs(summary.netBalance))}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {summary.netBalance > 0 ? 'You are owed' : summary.netBalance < 0 ? 'You owe' : 'All settled'}
            </p>
          </div>
          <div className={`p-3 rounded-full ${
            summary.netBalance > 0 
              ? 'bg-green-100 dark:bg-green-900' 
              : summary.netBalance < 0 
                ? 'bg-red-100 dark:bg-red-900'
                : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <div className={getBalanceColor(summary.netBalance)}>
              {getBalanceIcon(summary.netBalance)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Detailed breakdown */}
      {detailed && (
        <>
          {/* People who owe you */}
          {summary.owingToUserSplits && summary.owingToUserSplits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`md:col-span-3 p-6 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                People who owe you
              </h3>
              <div className="space-y-3">
                {summary.owingToUserSplits.map((split, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {split.participant_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {split.Expense?.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(split.amount)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {split.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* People you owe */}
          {summary.owedSplits && summary.owedSplits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`md:col-span-3 p-6 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                People you owe
              </h3>
              <div className="space-y-3">
                {summary.owedSplits.map((split, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {split.payer?.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {split.Expense?.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600 dark:text-red-400">
                        {formatCurrency(split.amount)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {split.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default SplitSummary;
