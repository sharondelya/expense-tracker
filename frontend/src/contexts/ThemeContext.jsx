import React, { createContext, useContext, useState, useEffect } from 'react';
import currencyService from '../services/currencyService';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  const [currency, setCurrency] = useState(() => {
    const savedCurrency = localStorage.getItem('currency');
    return savedCurrency || 'USD';
  });

  const [dateFormat, setDateFormat] = useState(() => {
    const savedDateFormat = localStorage.getItem('dateFormat');
    return savedDateFormat || 'MM/DD/YYYY';
  });

  const [notifications, setNotifications] = useState(() => {
    const savedNotifications = localStorage.getItem('notifications');
    return savedNotifications ? JSON.parse(savedNotifications) : {
      push: true,
      email: true,
      budget: true,
      weekly: false
    };
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('dateFormat', dateFormat);
  }, [dateFormat]);

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const updateCurrency = (newCurrency) => {
    setCurrency(newCurrency);
  };

  const updateDateFormat = (newFormat) => {
    setDateFormat(newFormat);
  };

  const updateNotifications = (newNotifications) => {
    setNotifications(prev => ({ ...prev, ...newNotifications }));
  };

  const formatCurrency = (amount) => {
    return currencyService.formatCurrency(amount, currency);
  };

  const formatDate = (date) => {
    const dateObj = new Date(date);
    
    switch (dateFormat) {
      case 'DD/MM/YYYY':
        return dateObj.toLocaleDateString('en-GB');
      case 'YYYY-MM-DD':
        return dateObj.toISOString().split('T')[0];
      case 'MM/DD/YYYY':
      default:
        return dateObj.toLocaleDateString('en-US');
    }
  };

  const value = {
    theme,
    currency,
    dateFormat,
    notifications,
    toggleTheme,
    updateCurrency,
    updateDateFormat,
    updateNotifications,
    formatCurrency,
    formatDate
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};