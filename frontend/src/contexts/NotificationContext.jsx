import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load notifications from localStorage
    const savedNotifications = localStorage.getItem('app_notifications');
    if (savedNotifications) {
      const parsed = JSON.parse(savedNotifications);
      setNotifications(parsed);
      setUnreadCount(parsed.filter(n => !n.read).length);
    }
  }, []);

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Save to localStorage
    const updatedNotifications = [newNotification, ...notifications];
    localStorage.setItem('app_notifications', JSON.stringify(updatedNotifications));

    // Only show toast notification if showToast is explicitly set to true
    if (notification.showToast === true) {
      switch (notification.type) {
        case 'success':
          toast.success(notification.message);
          break;
        case 'error':
          toast.error(notification.message);
          break;
        case 'warning':
          toast(notification.message, { icon: '⚠️' });
          break;
        case 'budget':
          toast(notification.message, { icon: '💰' });
          break;
        default:
          toast(notification.message);
      }
    }
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Update localStorage
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    );
    localStorage.setItem('app_notifications', JSON.stringify(updatedNotifications));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);

    // Update localStorage
    const updatedNotifications = notifications.map(notification => 
      ({ ...notification, read: true })
    );
    localStorage.setItem('app_notifications', JSON.stringify(updatedNotifications));
  };

  const clearNotification = (notificationId) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    setNotifications(prev => prev.filter(n => n.id !== notificationId));

    // Update localStorage
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    localStorage.setItem('app_notifications', JSON.stringify(updatedNotifications));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('app_notifications');
  };

  // Budget alert notifications
  const checkBudgetAlerts = (expenses, budget) => {
    if (!budget || budget <= 0) return;

    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const percentage = (totalExpenses / budget) * 100;

    if (percentage >= 90) {
      addNotification({
        type: 'warning',
        title: 'Budget Alert',
        message: `You've spent ${percentage.toFixed(1)}% of your monthly budget!`,
        category: 'budget',
        showToast: true
      });
    } else if (percentage >= 75) {
      addNotification({
        type: 'budget',
        title: 'Budget Warning',
        message: `You've spent ${percentage.toFixed(1)}% of your monthly budget.`,
        category: 'budget',
        showToast: true
      });
    }
  };

  // Weekly spending summary
  const sendWeeklyReport = (weeklyTotal, previousWeekTotal) => {
    const change = weeklyTotal - previousWeekTotal;
    const changePercentage = previousWeekTotal > 0 ? (change / previousWeekTotal) * 100 : 0;

    addNotification({
      type: 'info',
      title: 'Weekly Spending Report',
      message: `This week you spent $${weeklyTotal.toFixed(2)}. ${
        change > 0
          ? `That's ${changePercentage.toFixed(1)}% more than last week.`
          : `That's ${Math.abs(changePercentage).toFixed(1)}% less than last week.`
      }`,
      category: 'report',
      showToast: true
    });
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    checkBudgetAlerts,
    sendWeeklyReport
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};