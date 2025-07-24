// components/dashboard/StatsCard.jsx
import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon: Icon, gradient, textColor = "text-gray-900" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="card overflow-hidden"
    >
      <div className="card-content p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
          </div>
          <div className={`p-3 rounded-full ${gradient}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;