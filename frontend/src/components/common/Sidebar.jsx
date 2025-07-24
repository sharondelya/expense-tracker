// components/common/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Home, CreditCard, FolderOpen, TrendingUp, Settings, Repeat, FileText, Lightbulb, Users, Target } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { isDarkMode } = useTheme();

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: CreditCard, label: 'Expenses', path: '/expenses' },
    { icon: Users, label: 'Split Expenses', path: '/splits' },
    { icon: Repeat, label: 'Recurring', path: '/recurring' },
    { icon: FolderOpen, label: 'Categories', path: '/categories' },
    { icon: Target, label: 'Goals', path: '/goals' },
    { icon: TrendingUp, label: 'Analytics', path: '/analytics' },
    { icon: FileText, label: 'Reports', path: '/reports' },
    { icon: Lightbulb, label: 'Insights', path: '/insights' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside
        className={`fixed top-16 left-0 z-50 h-[calc(100vh-64px)] w-64 border-r transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:top-0 lg:h-full ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}
      >
        <div className={`flex items-center justify-between p-4 border-b lg:hidden transition-colors duration-200 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold transition-colors duration-200 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Menu
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-md transition-colors duration-200 ${
              isDarkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 px-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? isDarkMode
                      ? 'bg-blue-900/50 text-blue-300 border-r-2 border-blue-400'
                      : 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                    : isDarkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;