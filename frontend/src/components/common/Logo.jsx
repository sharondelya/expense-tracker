import React from 'react';

const Logo = ({ className = "h-10 w-10", showText = true, textSize = "text-2xl" }) => {
  return (
    <div className="flex items-center space-x-3">
      {/* Inline SVG Logo */}
      <div className={`${className} rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="text-white"
        >
          <path 
            d="M12 4v2m0 12v2m-6-8c0-1.5 1.5-3 4-3h4c2.5 0 4 1.5 4 3s-1.5 3-4 3h-4c-2.5 0-4 1.5-4 3s1.5 3 4 3h4c2.5 0 4-1.5 4-3" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            fill="none"
          />
        </svg>
      </div>
      
      {showText && (
        <div>
          <h1 className={`${textSize} font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 bg-clip-text text-transparent`}>
            Expense Tracker
          </h1>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Smart Budget Management
          </p>
        </div>
      )}
    </div>
  );
};

export default Logo;
