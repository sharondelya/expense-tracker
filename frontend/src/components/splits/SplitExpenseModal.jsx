import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Users, DollarSign, Percent, Calculator } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';

const SplitExpenseModal = ({ onClose, onSuccess, groups = [], preSelectedExpenseId = null }) => {
  const { theme } = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [participants, setParticipants] = useState([{ name: '', email: '', amount: 0, percentage: 0 }]);
  const [notes, setNotes] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    if (preSelectedExpenseId && expenses.length > 0) {
      const expense = expenses.find(e => e.id === preSelectedExpenseId);
      if (expense) {
        setSelectedExpense(preSelectedExpenseId);
      }
    }
  }, [preSelectedExpenseId, expenses]);

  useEffect(() => {
    if (selectedGroup && groups.length > 0) {
      const group = groups.find(g => g.id === selectedGroup);
      if (group && group.members) {
        // Filter out the current user from group members
        const currentUserEmail = localStorage.getItem('userEmail');
        const groupParticipants = group.members
          .filter(member => member.email !== currentUserEmail)
          .map(member => ({
            name: member.name,
            email: member.email,
            amount: 0,
            percentage: 0
          }));
        setParticipants(groupParticipants.length > 0 ? groupParticipants : [{ name: '', email: '', amount: 0, percentage: 0 }]);
      }
    }
  }, [selectedGroup, groups]);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/expenses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const addParticipant = () => {
    setParticipants([...participants, { name: '', email: '', amount: 0, percentage: 0 }]);
  };

  const removeParticipant = (index) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const updateParticipant = (index, field, value) => {
    const updated = [...participants];
    updated[index][field] = value;
    setParticipants(updated);
  };

  const calculateSplitPreview = () => {
    const expense = expenses.find(e => e.id === selectedExpense);
    if (!expense) return null;

    const totalAmount = parseFloat(expense.amount);
    let preview = [];

    if (splitType === 'equal') {
      const splitAmount = totalAmount / (participants.length + 1); // +1 for payer
      preview = participants.map(p => ({
        ...p,
        calculatedAmount: splitAmount
      }));
    } else if (splitType === 'percentage') {
      const totalPercentage = participants.reduce((sum, p) => sum + (parseFloat(p.percentage) || 0), 0);
      const remainingPercentage = Math.max(0, 100 - totalPercentage);
      
      preview = participants.map(p => ({
        ...p,
        calculatedAmount: (totalAmount * (parseFloat(p.percentage) || 0)) / 100
      }));
      
      preview.push({
        name: 'You (Payer)',
        calculatedAmount: (totalAmount * remainingPercentage) / 100,
        isCurrentUser: true
      });
    } else if (splitType === 'amount') {
      const totalSplitAmount = participants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const remainingAmount = Math.max(0, totalAmount - totalSplitAmount);
      
      preview = participants.map(p => ({
        ...p,
        calculatedAmount: parseFloat(p.amount) || 0
      }));
      
      preview.push({
        name: 'You (Payer)',
        calculatedAmount: remainingAmount,
        isCurrentUser: true
      });
    }

    return { preview, totalAmount };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedExpense) {
      toast.error('Please select an expense');
      return;
    }

    if (participants.some(p => !p.name || !p.email)) {
      toast.error('Please fill in all participant details');
      return;
    }

    if (splitType === 'percentage') {
      const totalPercentage = participants.reduce((sum, p) => sum + (parseFloat(p.percentage) || 0), 0);
      if (totalPercentage > 100) {
        toast.error('Total percentage cannot exceed 100%');
        return;
      }
    }

    if (splitType === 'amount') {
      const expense = expenses.find(e => e.id === selectedExpense);
      const totalSplitAmount = participants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      if (totalSplitAmount > parseFloat(expense.amount)) {
        toast.error('Split amounts cannot exceed total expense amount');
        return;
      }
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/splits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          expenseId: selectedExpense,
          participants: participants.map(p => ({
            name: p.name,
            email: p.email,
            amount: splitType === 'amount' ? parseFloat(p.amount) : undefined,
            percentage: splitType === 'percentage' ? parseFloat(p.percentage) : undefined
          })),
          splitType,
          notes
        })
      });

      if (response.ok) {
        toast.success('Expense split created successfully!');
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create split');
      }
    } catch (error) {
      console.error('Error creating split:', error);
      toast.error('Failed to create split');
    } finally {
      setLoading(false);
    }
  };

  const splitPreview = calculateSplitPreview();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Split Expense
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Expense Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Expense
              </label>
              <select
                value={selectedExpense}
                onChange={(e) => setSelectedExpense(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Choose an expense to split</option>
                {expenses.map(expense => (
                  <option key={expense.id} value={expense.id}>
                    {expense.description} - ${expense.amount} ({new Date(expense.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Group Selection */}
            {groups.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Use Group (Optional)
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a group or add participants manually</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.members?.length || 0} members)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Split Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Split Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'equal', label: 'Equal Split', icon: Users },
                  { value: 'percentage', label: 'By Percentage', icon: Percent },
                  { value: 'amount', label: 'By Amount', icon: DollarSign }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSplitType(value)}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      splitType === value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Participants */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Participants
                </label>
                <button
                  type="button"
                  onClick={addParticipant}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <Plus className="w-4 h-4" />
                  Add Participant
                </button>
              </div>

              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Name"
                        value={participant.name}
                        onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="email"
                        placeholder="Email"
                        value={participant.email}
                        onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    {splitType === 'percentage' && (
                      <div className="w-24">
                        <input
                          type="number"
                          placeholder="%"
                          min="0"
                          max="100"
                          step="0.01"
                          value={participant.percentage}
                          onChange={(e) => updateParticipant(index, 'percentage', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                    {splitType === 'amount' && (
                      <div className="w-24">
                        <input
                          type="number"
                          placeholder="$"
                          min="0"
                          step="0.01"
                          value={participant.amount}
                          onChange={(e) => updateParticipant(index, 'amount', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      disabled={participants.length === 1}
                      className="p-2 text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Split Preview */}
            {splitPreview && (
              <div className={`p-4 rounded-lg border ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4" />
                  <h3 className="font-medium text-gray-900 dark:text-white">Split Preview</h3>
                </div>
                <div className="space-y-2">
                  {splitPreview.preview.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className={`text-sm ${item.isCurrentUser ? 'font-medium' : ''} text-gray-700 dark:text-gray-300`}>
                        {item.name}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        ${item.calculatedAmount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-gray-900 dark:text-white">
                        ${splitPreview.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any additional notes about this split..."
              />
            </div>

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
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating Split...' : 'Create Split'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SplitExpenseModal;