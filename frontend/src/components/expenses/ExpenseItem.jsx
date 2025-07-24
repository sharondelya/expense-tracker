// components/expenses/ExpenseItem.jsx
import React, { useState } from 'react';
import { Edit2, Trash2, Tag } from 'lucide-react';
import { useDeleteExpense } from '../../hooks/useExpenses';
import ExpenseForm from './ExpenseForm';
import { formatCurrency, formatDate } from '../../utils/formatters';

const ExpenseItem = ({ expense }) => {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteExpenseMutation = useDeleteExpense();

  const handleDelete = async () => {
    try {
      await deleteExpenseMutation.mutateAsync(expense.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const typeColor = expense.type === 'income' ? 'text-green-600' : 'text-red-600';
  const typeSign = expense.type === 'income' ? '+' : '-';

  return (
    <>
      <div className="card hover:shadow-md transition-shadow">
        <div className="card-content p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{expense.description}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-gray-500">
                      {expense.category?.name}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-500">
                      {formatDate(expense.date)}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-500 capitalize">
                      {expense.paymentMethod?.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {expense.tags && expense.tags.length > 0 && (
                    <div className="flex items-center space-x-1 mt-2">
                      <Tag className="h-3 w-3 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {expense.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {expense.notes && (
                    <p className="text-sm text-gray-600 mt-2">{expense.notes}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`text-lg font-semibold ${typeColor}`}>
                    {typeSign}{formatCurrency(expense.amount)}
                  </span>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setShowEditForm(true)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <ExpenseForm 
              expense={expense} 
              onClose={() => setShowEditForm(false)} 
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Expense
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{expense.description}"? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleDelete}
                disabled={deleteExpenseMutation.isLoading}
                className="btn-primary bg-red-600 hover:bg-red-700"
              >
                {deleteExpenseMutation.isLoading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpenseItem;