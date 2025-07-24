import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Palette, 
  Download, 
  Trash2, 
  Save, 
  Check,
  Moon,
  Sun,
  Eye,
  EyeOff,
  Camera,
  AlertTriangle,
  Calendar,
  FileText,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import apiManager from '../../services/apiManager';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import currencyService from '../../services/currencyService';

const Settings = () => {
  const { user, updateProfile, refreshUser } = useAuth();
  const { 
    theme, 
    currency, 
    dateFormat, 
    notifications: themeNotifications,
    toggleTheme, 
    updateCurrency, 
    updateDateFormat, 
    updateNotifications: updateThemeNotifications,
    formatCurrency 
  } = useTheme();
  const { addNotification, notifications, clearAllNotifications } = useNotifications();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestEmailLoading, setIsTestEmailLoading] = useState(false);
  const [isWeeklyReportLoading, setIsWeeklyReportLoading] = useState(false);
  const [isBudgetAlertsLoading, setIsBudgetAlertsLoading] = useState(false);
  const [isAutomatedWeeklyLoading, setIsAutomatedWeeklyLoading] = useState(false);
  const [isMonthlyReportsLoading, setIsMonthlyReportsLoading] = useState(false);
  const [isRecurringLoading, setIsRecurringLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    monthlyBudget: user?.monthlyBudget || 0,
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        monthlyBudget: user.monthlyBudget || 0,
      }));
    }
  }, [user]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data & Privacy', icon: Download },
  ];

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        // Remove email from update - email updates not allowed
        monthlyBudget: parseFloat(formData.monthlyBudget) || 0,
      };
      
      console.log('🔧 Sending profile update:', updateData);
      console.log('📊 Monthly budget value:', formData.monthlyBudget, 'parsed:', parseFloat(formData.monthlyBudget));
      
      await updateProfile(updateData);
      
      toast.success('Profile updated successfully!');
      addNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile information has been updated successfully.',
        category: 'profile'
      });
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Profile update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await apiManager.put('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      toast.success('Password changed successfully!');
      addNotification({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password has been updated successfully.',
        category: 'security'
      });
      
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeToggle = () => {
    toggleTheme();
    toast.success(`Switched to ${theme === 'light' ? 'dark' : 'light'} theme`);
    addNotification({
      type: 'info',
      title: 'Theme Changed',
      message: `Switched to ${theme === 'light' ? 'dark' : 'light'} theme`,
      category: 'preferences'
    });
  };

  const handleCurrencyChange = async (newCurrency) => {
    const oldCurrency = currency;
    
    if (oldCurrency === newCurrency) {
      return;
    }

    // Show confirmation dialog for currency conversion
    const shouldConvert = window.confirm(
      `Do you want to convert all existing amounts from ${oldCurrency} to ${newCurrency}?\n\n` +
      `This will convert:\n` +
      `• All expense and income records\n` +
      `• Budget amounts\n` +
      `• Financial goals\n` +
      `• Recurring transactions\n\n` +
      `Exchange rate: 1 ${oldCurrency} = ${currencyService.getExchangeRate(oldCurrency, newCurrency).toFixed(4)} ${newCurrency}\n\n` +
      `Click OK to convert amounts, or Cancel to just change the currency symbol.`
    );

    if (shouldConvert) {
      setIsLoading(true);
      try {
        // Convert all amounts in the database
        const conversionRate = currencyService.getExchangeRate(oldCurrency, newCurrency);
        
        const response = await api.post('/settings/convert-currency', {
          fromCurrency: oldCurrency,
          toCurrency: newCurrency,
          conversionRate: conversionRate
        });

        if (response.data.success) {
          updateCurrency(newCurrency);
          toast.success(
            `Currency converted successfully! ` +
            `${response.data.convertedCounts?.expenses || 0} expenses, ` +
            `${response.data.convertedCounts?.goals || 0} goals, ` +
            `${response.data.convertedCounts?.recurring || 0} recurring transactions updated.`
          );
          
          addNotification({
            type: 'success',
            title: 'Currency Converted',
            message: `All amounts successfully converted from ${oldCurrency} to ${newCurrency}`,
            category: 'preferences'
          });

          // Refresh user data to get updated amounts
          await refreshUser();
        } else {
          throw new Error(response.data.message || 'Conversion failed');
        }
      } catch (error) {
        console.error('Currency conversion error:', error);
        toast.error(`Failed to convert currency: ${error.message}`);
        
        addNotification({
          type: 'error',
          title: 'Currency Conversion Failed',
          message: error.message || 'Failed to convert existing amounts',
          category: 'preferences'
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Just change the currency symbol without converting amounts
      updateCurrency(newCurrency);
      toast.success(`Currency symbol changed to ${newCurrency} (amounts not converted)`);
      addNotification({
        type: 'info',
        title: 'Currency Symbol Updated',
        message: `Currency symbol changed to ${newCurrency}. Amounts were not converted.`,
        category: 'preferences'
      });
    }
  };

  const handleDateFormatChange = (newFormat) => {
    updateDateFormat(newFormat);
    toast.success(`Date format changed to ${newFormat}`);
  };

  const handleNotificationToggle = (type, value) => {
    const newNotifications = { ...themeNotifications, [type]: value };
    updateThemeNotifications(newNotifications);
    toast.success(`${type} notifications ${value ? 'enabled' : 'disabled'}`);
    
    addNotification({
      type: 'info',
      title: 'Notification Settings Updated',
      message: `${type} notifications ${value ? 'enabled' : 'disabled'}`,
      category: 'notifications'
    });
  };

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF();
      
      // Add title
      pdf.setFontSize(20);
      pdf.text('Expense Tracker - Data Export', 20, 30);
      
      // Add user info
      pdf.setFontSize(12);
      pdf.text(`User: ${user?.firstName} ${user?.lastName}`, 20, 50);
      pdf.text(`Email: ${user?.email}`, 20, 60);
      pdf.text(`Export Date: ${new Date().toLocaleDateString()}`, 20, 70);
      
      // Add sample data (replace with actual data)
      pdf.text('Recent Expenses:', 20, 90);
      const sampleExpenses = [
        'Grocery Shopping - $156.75 - 2024-01-15',
        'Gas Station - $85.50 - 2024-01-14',
        'Restaurant Dinner - $78.25 - 2024-01-13',
        'Online Shopping - $125.00 - 2024-01-12',
        'Movie Tickets - $45.50 - 2024-01-11'
      ];
      
      sampleExpenses.forEach((expense, index) => {
        pdf.text(`• ${expense}`, 25, 100 + (index * 10));
      });
      
      // Add summary
      pdf.text('Monthly Summary:', 20, 160);
      pdf.text(`Total Expenses: ${formatCurrency(490.50)}`, 25, 170);
      pdf.text(`Budget: ${formatCurrency(1000)}`, 25, 180);
      pdf.text(`Remaining: ${formatCurrency(509.50)}`, 25, 190);
      
      // Save the PDF
      pdf.save('expense-tracker-data.pdf');
      
      toast.success('Data exported to PDF successfully!');
      addNotification({
        type: 'success',
        title: 'Data Exported',
        message: 'Your expense data has been exported to PDF successfully.',
        category: 'export'
      });
    } catch (error) {
      toast.error('Failed to export data to PDF');
      console.error('PDF export error:', error);
    }
  };

  const exportToCSV = () => {
    try {
      const csvData = [
        ['Date', 'Description', 'Amount', 'Category'],
        ['2024-01-15', 'Grocery Shopping', '156.75', 'Food & Dining'],
        ['2024-01-14', 'Gas Station', '85.50', 'Transportation'],
        ['2024-01-13', 'Restaurant Dinner', '78.25', 'Food & Dining'],
        ['2024-01-12', 'Online Shopping', '125.00', 'Shopping'],
        ['2024-01-11', 'Movie Tickets', '45.50', 'Entertainment']
      ];
      
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'expense-tracker-data.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Data exported to CSV successfully!');
      addNotification({
        type: 'success',
        title: 'Data Exported',
        message: 'Your expense data has been exported to CSV successfully.',
        category: 'export'
      });
    } catch (error) {
      toast.error('Failed to export data to CSV');
      console.error('CSV export error:', error);
    }
  };

  const handleTestEmail = async () => {
    try {
      setIsTestEmailLoading(true);
      await apiManager.post('/notifications/test-email');

      addNotification({
        type: 'success',
        title: 'Test Email Sent',
        message: 'Check your inbox for the test email.',
        category: 'system'
      });
      toast.success('Test email sent successfully!');
    } catch (error) {
      console.error('Error sending test email:', error);
      
      let errorMessage = 'Unable to send test email. Please try again.';
      if (error.message?.includes('429') || error.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }
      
      addNotification({
        type: 'error',
        title: 'Email Test Failed',
        message: errorMessage,
        category: 'system'
      });
      toast.error('Failed to send test email');
    } finally {
      setIsTestEmailLoading(false);
    }
  };

  const handleWeeklyReport = async () => {
    try {
      setIsWeeklyReportLoading(true);
      await apiManager.post('/notifications/weekly-report');

      addNotification({
        type: 'success',
        title: 'Weekly Report Sent',
        message: 'Your weekly report has been sent to your email.',
        category: 'reports'
      });
      toast.success('Weekly report sent successfully!');
    } catch (error) {
      console.error('Error sending weekly report:', error);
      
      let errorMessage = 'Unable to send weekly report. Please try again.';
      if (error.message?.includes('429') || error.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }
      
      addNotification({
        type: 'error',
        title: 'Report Failed',
        message: errorMessage,
        category: 'reports'
      });
      toast.error('Failed to send weekly report');
    } finally {
      setIsWeeklyReportLoading(false);
    }
  };

  // Automation Testing Functions
  const handleTestBudgetAlerts = async () => {
    try {
      setIsBudgetAlertsLoading(true);
      await apiManager.post('/scheduler/test/budget-alerts');

      addNotification({
        type: 'success',
        title: 'Budget Alerts Test',
        message: 'Budget alerts test completed! Check console for details.',
        category: 'system'
      });
      toast.success('Budget alerts test completed!');
    } catch (error) {
      console.error('Error testing budget alerts:', error);
      toast.error('Failed to test budget alerts');
    } finally {
      setIsBudgetAlertsLoading(false);
    }
  };

  const handleTestAutomatedWeekly = async () => {
    try {
      setIsAutomatedWeeklyLoading(true);
      await apiManager.post('/scheduler/test/weekly-reports');

      addNotification({
        type: 'success',
        title: 'Automated Weekly Test',
        message: 'Automated weekly reports test completed! Check your email.',
        category: 'system'
      });
      toast.success('Automated weekly reports test completed!');
    } catch (error) {
      console.error('Error testing automated weekly reports:', error);
      toast.error('Failed to test automated weekly reports');
    } finally {
      setIsAutomatedWeeklyLoading(false);
    }
  };

  const handleTestMonthlyReports = async () => {
    try {
      setIsMonthlyReportsLoading(true);
      await apiManager.post('/scheduler/test/monthly-reports');

      addNotification({
        type: 'success',
        title: 'Monthly Reports Test',
        message: 'Monthly reports test completed! Check your email.',
        category: 'system'
      });
      toast.success('Monthly reports test completed!');
    } catch (error) {
      console.error('Error testing monthly reports:', error);
      toast.error('Failed to test monthly reports');
    } finally {
      setIsMonthlyReportsLoading(false);
    }
  };

  const handleTestRecurringTransactions = async () => {
    try {
      setIsRecurringLoading(true);
      await apiManager.post('/scheduler/test/recurring-transactions');

      addNotification({
        type: 'success',
        title: 'Recurring Transactions Test',
        message: 'Recurring transactions test completed! Check console for details.',
        category: 'system'
      });
      toast.success('Recurring transactions test completed!');
    } catch (error) {
      console.error('Error testing recurring transactions:', error);
      toast.error('Failed to test recurring transactions');
    } finally {
      setIsRecurringLoading(false);
    }
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      console.log('🖼️ Uploading profile picture...');
      
      // Use direct api service instead of apiManager for file uploads
      const response = await api.post('/auth/upload-profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('🖼️ Upload successful:', response.data);

      toast.success('Profile picture updated successfully!');
      addNotification({
        type: 'success',
        title: 'Profile Picture Updated',
        message: 'Your profile picture has been updated successfully.',
        category: 'profile'
      });
      
      // Refresh user data to get updated profile picture
      await refreshUser();
      
    } catch (error) {
      console.error('Profile picture upload error:', error);
      
      let errorMessage = 'Failed to upload profile picture';
      if (error.response?.status === 404) {
        errorMessage = 'Upload endpoint not found. Please contact support.';
      } else if (error.message?.includes('429') || error.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    // Show confirmation dialog
    const isConfirmed = window.confirm(
      '⚠️ WARNING: This action will permanently delete ALL your data including:\n\n' +
      '• All expenses and transactions\n' +
      '• All categories (except defaults)\n' +
      '• All financial goals\n' +
      '• All recurring transactions\n' +
      '• All split expenses\n' +
      '• Profile picture and preferences\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Are you absolutely sure you want to continue?'
    );

    if (!isConfirmed) {
      return;
    }

    // Second confirmation
    const secondConfirmation = window.confirm(
      '🚨 FINAL WARNING!\n\n' +
      'You are about to delete ALL your data permanently.\n' +
      'This action is IRREVERSIBLE!\n\n' +
      'Type "DELETE" in the next prompt to confirm.'
    );

    if (!secondConfirmation) {
      return;
    }

    // Text confirmation
    const textConfirmation = prompt(
      'Please type "DELETE" (in capital letters) to confirm the deletion of all your data:'
    );

    if (textConfirmation !== 'DELETE') {
      toast.error('Deletion cancelled - confirmation text did not match');
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiManager.delete('/auth/delete-all-data');

      toast.success('All data has been successfully deleted!');
      addNotification({
        type: 'success',
        title: 'Data Deleted',
        message: `Successfully deleted ${data.deletionSummary?.totalRecordsDeleted || 'all'} records from your account.`,
        category: 'system'
      });
      
      // Refresh the page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error deleting data:', error);
      
      let errorMessage = 'Unable to delete data. Please try again.';
      if (error.message?.includes('429') || error.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }
      
      toast.error('Failed to delete data: ' + errorMessage);
      addNotification({
        type: 'error',
        title: 'Deletion Failed',
        message: errorMessage,
        category: 'system'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileTab = () => (
    <form onSubmit={handleProfileUpdate} className="space-y-6">
      <div className="flex items-center space-x-6">
        <div className="relative">
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          )}
          <input
            type="file"
            id="profilePictureInput"
            accept="image/*"
            onChange={handleProfilePictureUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => document.getElementById('profilePictureInput').click()}
            disabled={isLoading}
            className="absolute -bottom-1 -right-1 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            ) : (
              <Camera className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Picture</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Update your profile picture</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className="input-field"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
          <span className="text-xs text-gray-500 ml-2">(Read-only)</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          readOnly
          className="input-field bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Monthly Budget ({currency})
        </label>
        <input
          type="number"
          name="monthlyBudget"
          value={formData.monthlyBudget}
          onChange={handleInputChange}
          className="input-field"
          min="0"
          step="0.01"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Saving...
          </div>
        ) : (
          <div className="flex items-center">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </div>
        )}
      </button>
    </form>
  );

  const renderSecurityTab = () => (
    <form onSubmit={handlePasswordChange} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleInputChange}
            className="input-field pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          New Password
        </label>
        <input
          type={showPassword ? "text" : "password"}
          name="newPassword"
          value={formData.newPassword}
          onChange={handleInputChange}
          className="input-field"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Confirm New Password
        </label>
        <input
          type={showPassword ? "text" : "password"}
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          className="input-field"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Changing...
          </div>
        ) : (
          <div className="flex items-center">
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </div>
        )}
      </button>
    </form>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">App Preferences</h3>
        </div>
        <div className="card-content space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Theme</label>
              <p className="text-sm text-gray-500">Choose your preferred theme</p>
            </div>
            <button
              onClick={handleThemeToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              {theme === 'dark' ? (
                <Moon className="absolute left-1 h-3 w-3 text-blue-600" />
              ) : (
                <Sun className="absolute right-1 h-3 w-3 text-gray-400" />
              )}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <div className="space-y-2">
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="input-field"
                disabled={isLoading}
              >
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="PKR">PKR (₨) - Pakistani Rupee</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="JPY">JPY (¥) - Japanese Yen</option>
              </select>
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  <span>Current currency: {currencyService.getCurrencyInfo(currency).name}</span>
                </div>
                <div className="text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Changing currency will offer to convert existing amounts using current exchange rates
                </div>
                <div className="text-xs text-gray-400">
                  Exchange rates last updated: {currencyService.lastUpdated?.toLocaleDateString() || 'Never'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select
              value={dateFormat}
              onChange={(e) => handleDateFormatChange(e.target.value)}
              className="input-field"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
        </div>
        <div className="card-content space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Push Notifications</label>
              <p className="text-sm text-gray-500">Receive notifications in the app</p>
            </div>
            <button
              onClick={() => handleNotificationToggle('push', !themeNotifications.push)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                themeNotifications.push ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  themeNotifications.push ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Email Alerts</label>
              <p className="text-sm text-gray-500">Receive email notifications for important updates</p>
            </div>
            <button
              onClick={() => handleNotificationToggle('email', !themeNotifications.email)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                themeNotifications.email ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  themeNotifications.email ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Budget Alerts</label>
              <p className="text-sm text-gray-500">Get notified when approaching budget limits</p>
            </div>
            <button
              onClick={() => handleNotificationToggle('budget', !themeNotifications.budget)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                themeNotifications.budget ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  themeNotifications.budget ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Weekly Reports</label>
              <p className="text-sm text-gray-500">Receive weekly spending summaries</p>
            </div>
            <button
              onClick={() => handleNotificationToggle('weekly', !themeNotifications.weekly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                themeNotifications.weekly ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  themeNotifications.weekly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Email Testing</h3>
        </div>
        <div className="card-content space-y-4">
          <p className="text-gray-600">
            Test your email notification settings to ensure they're working properly.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleTestEmail}
              disabled={isTestEmailLoading}
              className="btn-outline flex items-center justify-center"
            >
              {isTestEmailLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Test Email
            </button>
            
            <button
              onClick={handleWeeklyReport}
              disabled={isWeeklyReportLoading}
              className="btn-outline flex items-center justify-center"
            >
              {isWeeklyReportLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Send Weekly Report
            </button>
          </div>
        </div>

        {/* Automation Testing */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">🤖 Test Automation</h3>
            <p className="text-sm text-gray-600 mt-1">
              Test the automated notification system immediately (respects your notification settings above)
            </p>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={handleTestBudgetAlerts}
                disabled={isBudgetAlertsLoading}
                className="btn-outline flex items-center justify-center"
              >
                {isBudgetAlertsLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Test Budget Alerts
              </button>
              
              <button
                onClick={handleTestAutomatedWeekly}
                disabled={isAutomatedWeeklyLoading}
                className="btn-outline flex items-center justify-center"
              >
                {isAutomatedWeeklyLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Test Auto Weekly Reports
              </button>
              
              <button
                onClick={handleTestMonthlyReports}
                disabled={isMonthlyReportsLoading}
                className="btn-outline flex items-center justify-center"
              >
                {isMonthlyReportsLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Test Monthly Reports
              </button>
              
              <button
                onClick={handleTestRecurringTransactions}
                disabled={isRecurringLoading}
                className="btn-outline flex items-center justify-center"
              >
                {isRecurringLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Test Recurring Transactions
              </button>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ How it works:</strong> These buttons test the same automation that runs on schedule:
              </p>
              <ul className="text-xs text-blue-700 mt-2 ml-4 space-y-1">
                <li>• Budget Alerts: Checks if you're near your monthly budget limit</li>
                <li>• Auto Weekly Reports: Sends weekly summary (only if enabled above)</li>
                <li>• Monthly Reports: Sends monthly summary (only if enabled above)</li>
                <li>• Recurring Transactions: Processes any due recurring transactions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
            <button
              onClick={clearAllNotifications}
              className="btn-outline text-sm"
            >
              Clear All
            </button>
          </div>
          <div className="card-content">
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{notification.title}</p>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
        </div>
        <div className="card-content space-y-4">
          <p className="text-gray-600">
            Export your expense data in various formats for backup or analysis.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={exportToPDF}
              className="btn-outline flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export as PDF
            </button>
            
            <button
              onClick={exportToCSV}
              className="btn-outline flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 text-red-600">Danger Zone</h3>
        </div>
        <div className="card-content space-y-4">
          <p className="text-gray-600">
            These actions are irreversible. Please proceed with caution.
          </p>
          
          <button
            onClick={handleDeleteAllData}
            disabled={isLoading}
            className="btn-outline border-red-300 text-red-600 hover:bg-red-50 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Deleting...' : 'Delete All Data'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'security':
        return renderSecurityTab();
      case 'preferences':
        return renderPreferencesTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'data':
        return renderDataTab();
      default:
        return renderProfileTab();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;