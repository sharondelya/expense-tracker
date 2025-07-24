// components/common/Header.jsx
import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import NotificationDropdown from './NotificationDropdown';
import Logo from './Logo';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSettingsClick = () => {
    navigate('/settings');
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
  };

  return (
    <header className={`${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700 shadow-gray-900/20' 
        : 'bg-white border-gray-200 shadow-gray-900/10'
    } border-b px-4 py-4 lg:px-6 transition-all duration-200 sticky top-0 z-50 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className={`lg:hidden p-2 rounded-md transition-colors duration-200 ${
              isDarkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-4">
            {/* Desktop Logo */}
            <div className="hidden sm:block">
              <Logo showText={true} textSize="text-2xl" />
            </div>
            
            {/* Mobile Logo */}
            <div className="block sm:hidden">
              <Logo showText={true} textSize="text-lg" />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notification Dropdown */}
          <NotificationDropdown />

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center space-x-3 p-2 rounded-md transition-colors duration-200 ${
                isDarkMode
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border border-gray-300"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
              <span className={`hidden md:block text-sm font-medium transition-colors duration-200 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                {user?.firstName} {user?.lastName}
              </span>
            </button>

            {dropdownOpen && (
              <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg border z-50 transition-colors duration-200 ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="py-1">
                  <div className={`px-4 py-2 text-xs border-b transition-colors duration-200 ${
                    isDarkMode
                      ? 'text-gray-400 border-gray-700'
                      : 'text-gray-500 border-gray-200'
                  }`}>
                    {user?.email}
                  </div>
                  <button
                    onClick={handleSettingsClick}
                    className={`flex items-center px-4 py-2 text-sm w-full transition-colors duration-200 ${
                      isDarkMode
                        ? 'text-gray-200 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className={`flex items-center px-4 py-2 text-sm w-full transition-colors duration-200 ${
                      isDarkMode
                        ? 'text-red-400 hover:bg-red-900/20'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;