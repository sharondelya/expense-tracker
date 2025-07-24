import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  FolderOpen,
  Utensils,
  Car,
  ShoppingBag,
  Film,
  Receipt,
  Heart,
  BookOpen,
  Plane,
  Home,
  User,
  Briefcase,
  Laptop,
  TrendingUp,
  Building,
  Key,
  Gift,
  MoreHorizontal,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Palette,
  Move,
  Eye,
  EyeOff
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CategoryManager = () => {
  const { theme, formatCurrency } = useTheme();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'FolderOpen',
    type: 'both',
    parentId: '',
    monthlyBudget: '',
    budgetLimit: ''
  });

  // Available icons mapping
  const iconMap = {
    FolderOpen,
    Utensils,
    Car,
    ShoppingBag,
    Film,
    Receipt,
    Heart,
    BookOpen,
    Plane,
    Home,
    User,
    Briefcase,
    Laptop,
    TrendingUp,
    Building,
    Key,
    Gift,
    MoreHorizontal,
    DollarSign,
    Target
  };

  const availableIcons = [
    { name: 'FolderOpen', label: 'Folder' },
    { name: 'Utensils', label: 'Food' },
    { name: 'Car', label: 'Transport' },
    { name: 'ShoppingBag', label: 'Shopping' },
    { name: 'Film', label: 'Entertainment' },
    { name: 'Receipt', label: 'Bills' },
    { name: 'Heart', label: 'Health' },
    { name: 'BookOpen', label: 'Education' },
    { name: 'Plane', label: 'Travel' },
    { name: 'Home', label: 'Home' },
    { name: 'User', label: 'Personal' },
    { name: 'Briefcase', label: 'Work' },
    { name: 'Laptop', label: 'Freelance' },
    { name: 'TrendingUp', label: 'Investment' },
    { name: 'Building', label: 'Business' },
    { name: 'Key', label: 'Rental' },
    { name: 'Gift', label: 'Gift' },
    { name: 'DollarSign', label: 'Money' },
    { name: 'Target', label: 'Goal' },
    { name: 'MoreHorizontal', label: 'Other' }
  ];

  const predefinedColors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#C026D3', '#DB2777',
    '#E11D48', '#DC2626', '#9333EA', '#7C3AED'
  ];

  useEffect(() => {
    fetchCategories();
  }, [showInactive]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories', {
        params: {
          includeStats: true,
          includeInactive: showInactive
        }
      });
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        monthlyBudget: formData.monthlyBudget ? parseFloat(formData.monthlyBudget) : null,
        budgetLimit: formData.budgetLimit ? parseFloat(formData.budgetLimit) : null,
        parentId: formData.parentId || null
      };

      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, submitData);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', submitData);
        toast.success('Category created successfully');
      }

      setShowModal(false);
      setEditingCategory(null);
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon,
      type: category.type,
      parentId: category.parentId || '',
      monthlyBudget: category.monthlyBudget?.toString() || '',
      budgetLimit: category.budgetLimit?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await api.delete(`/categories/${id}`);
        toast.success('Category deleted successfully');
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        toast.error('Failed to delete category');
      }
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await api.put(`/categories/${id}`, { isActive: !isActive });
      toast.success(`Category ${!isActive ? 'activated' : 'deactivated'}`);
      fetchCategories();
    } catch (error) {
      console.error('Error toggling category:', error);
      toast.error('Failed to update category');
    }
  };

  const createDefaultCategories = async () => {
    try {
      await api.post('/categories/default');
      toast.success('Default categories created successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error creating default categories:', error);
      toast.error(error.response?.data?.message || 'Failed to create default categories');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      icon: 'FolderOpen',
      type: 'both',
      parentId: '',
      monthlyBudget: '',
      budgetLimit: ''
    });
  };

  const getIcon = (iconName) => {
    const IconComponent = iconMap[iconName] || FolderOpen;
    return IconComponent;
  };

  const getBudgetStatus = (category) => {
    if (!category.monthlyBudget || !category.monthlyStats) return null;
    
    const spent = category.monthlyStats.expenses?.total || 0;
    const budget = category.monthlyBudget;
    const percentage = (spent / budget) * 100;
    
    if (percentage >= 100) return 'over';
    if (percentage >= 80) return 'warning';
    return 'good';
  };

  const filteredCategories = categories.filter(category => {
    const matchesFilter = filter === 'all' || 
      (filter === 'income' && (category.type === 'income' || category.type === 'both')) ||
      (filter === 'expense' && (category.type === 'expense' || category.type === 'both')) ||
      (filter === 'budget' && category.monthlyBudget);
    
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const parentCategories = categories.filter(cat => !cat.parentId && cat.isActive);

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
            Category Manager
          </h1>
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Organize your expenses and income with custom categories
          </p>
        </div>
        
        <div className="flex gap-2">
          {categories.length === 0 && (
            <button
              onClick={createDefaultCategories}
              className="btn-outline"
            >
              Create Default Categories
            </button>
          )}
          <button
            onClick={() => {
              resetForm();
              setEditingCategory(null);
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search categories..."
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
          <option value="all">All Categories</option>
          <option value="income">Income Categories</option>
          <option value="expense">Expense Categories</option>
          <option value="budget">With Budget</option>
        </select>
        
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
            showInactive
              ? theme === 'dark'
                ? 'bg-blue-900 border-blue-700 text-blue-300'
                : 'bg-blue-50 border-blue-300 text-blue-700'
              : theme === 'dark'
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {showInactive ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
          {showInactive ? 'Hide Inactive' : 'Show Inactive'}
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid gap-4">
        {filteredCategories.map((category, index) => {
          const IconComponent = getIcon(category.icon);
          const budgetStatus = getBudgetStatus(category);
          
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`card ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''} ${!category.isActive ? 'opacity-60' : ''}`}
            >
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="p-3 rounded-full"
                      style={{ backgroundColor: `${category.color}20`, color: category.color }}
                    >
                      <IconComponent className="h-6 w-6" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {category.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          category.type === 'income'
                            ? 'bg-green-100 text-green-800'
                            : category.type === 'expense'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {category.type}
                        </span>
                        {!category.isActive && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                            Inactive
                          </span>
                        )}
                      </div>
                      
                      {category.description && (
                        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {category.description}
                        </p>
                      )}
                      
                      {category.monthlyStats && (
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          {category.monthlyStats.expenses.count > 0 && (
                            <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              Expenses: {formatCurrency(category.monthlyStats.expenses.total)} ({category.monthlyStats.expenses.count})
                            </span>
                          )}
                          {category.monthlyStats.income.count > 0 && (
                            <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              Income: {formatCurrency(category.monthlyStats.income.total)} ({category.monthlyStats.income.count})
                            </span>
                          )}
                        </div>
                      )}
                      
                      {category.monthlyBudget && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              Budget: {formatCurrency(category.monthlyBudget)}
                            </span>
                            {budgetStatus && (
                              <div className="flex items-center space-x-1">
                                {budgetStatus === 'over' && <XCircle className="h-4 w-4 text-red-500" />}
                                {budgetStatus === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                                {budgetStatus === 'good' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                <span className={`text-xs ${
                                  budgetStatus === 'over' ? 'text-red-600' :
                                  budgetStatus === 'warning' ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {category.budgetUsagePercentage?.toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </div>
                          {category.monthlyStats && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${
                                  budgetStatus === 'over' ? 'bg-red-500' :
                                  budgetStatus === 'warning' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{
                                  width: `${Math.min(category.budgetUsagePercentage || 0, 100)}%`
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleActive(category.id, category.isActive)}
                      className={`p-2 rounded-full ${
                        category.isActive
                          ? theme === 'dark' ? 'text-green-400 hover:bg-gray-700' : 'text-green-600 hover:bg-green-100'
                          : theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={category.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {category.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(category)}
                      className={`p-2 rounded-full ${theme === 'dark' ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-blue-100'}`}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(category.id)}
                      className={`p-2 rounded-full ${theme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-100'}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        
        {filteredCategories.length === 0 && (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No categories found</p>
            <p className="text-sm mt-1">Create your first category to get started</p>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto`}
            >
              <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      required
                    />
                  </div>
                  
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
                      <option value="both">Both</option>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    rows="2"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Parent Category (Optional)
                    </label>
                    <select
                      value={formData.parentId}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                      className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    >
                      <option value="">None</option>
                      {parentCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Monthly Budget (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monthlyBudget}
                      onChange={(e) => setFormData({ ...formData, monthlyBudget: e.target.value })}
                      className={`input-field ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    />
                  </div>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Color
                  </label>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 rounded border"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className={`input-field flex-1 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                      placeholder="#3B82F6"
                    />
                  </div>
                  <div className="grid grid-cols-10 gap-2">
                    {predefinedColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded border-2 ${formData.color === color ? 'border-gray-400' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Icon
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {availableIcons.map(({ name, label }) => {
                      const IconComponent = iconMap[name];
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: name })}
                          className={`p-3 rounded-lg border-2 flex items-center justify-center ${
                            formData.icon === name
                              ? theme === 'dark' ? 'border-blue-400 bg-blue-900' : 'border-blue-500 bg-blue-50'
                              : theme === 'dark' ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
                          }`}
                          title={label}
                        >
                          <IconComponent className="h-5 w-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCategory(null);
                      resetForm();
                    }}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingCategory ? 'Update' : 'Create'} Category
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryManager;