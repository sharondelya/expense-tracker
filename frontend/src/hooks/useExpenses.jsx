import { useQuery, useMutation, useQueryClient } from 'react-query';
import { expensesAPI } from '../services/api';
import toast from 'react-hot-toast';

export const useExpenses = (params = {}) => {
  return useQuery(['expenses', params], () => expensesAPI.getExpenses(params), {
    keepPreviousData: true,
  });
};

export const useExpense = (id) => {
  return useQuery(['expense', id], () => expensesAPI.getExpense(id), {
    enabled: !!id,
  });
};

export const useExpenseStats = (params = {}) => {
  return useQuery(['expense-stats', params], () => expensesAPI.getStats(params));
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation(expensesAPI.createExpense, {
    onSuccess: () => {
      queryClient.invalidateQueries('expenses');
      queryClient.invalidateQueries('expense-stats');
      toast.success('Expense created successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create expense';
      toast.error(message);
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, data }) => expensesAPI.updateExpense(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('expenses');
        queryClient.invalidateQueries('expense-stats');
        toast.success('Expense updated successfully!');
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to update expense';
        toast.error(message);
      },
    }
  );
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation(expensesAPI.deleteExpense, {
    onSuccess: () => {
      queryClient.invalidateQueries('expenses');
      queryClient.invalidateQueries('expense-stats');
      toast.success('Expense deleted successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete expense';
      toast.error(message);
    },
  });
};