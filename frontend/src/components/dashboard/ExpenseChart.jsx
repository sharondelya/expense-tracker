// components/dashboard/ExpenseChart.jsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

const ExpenseChart = ({ data, type, theme = 'light' }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        No data available
      </div>
    );
  }

  // Theme-aware colors for charts
  const getAxisColor = () => theme === 'dark' ? '#6B7280' : '#9CA3AF';
  const getGridColor = () => theme === 'dark' ? '#374151' : '#E5E7EB';
  const getTextColor = () => theme === 'dark' ? '#F3F4F6' : '#374151';

  if (type === 'daily') {
    const chartData = data.map(item => ({
      date: new Date(item.date).getDate(),
      amount: parseFloat(item.amount)
    }));

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={getGridColor()} />
            <XAxis dataKey="date" tick={{ fill: getTextColor(), fontSize: 12 }} />
            <YAxis tick={{ fill: getTextColor(), fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']}
              labelFormatter={(label) => `Day ${label}`}
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#374151' : '#FFFFFF',
                border: `1px solid ${theme === 'dark' ? '#6B7280' : '#E5E7EB'}`,
                borderRadius: '6px',
                color: getTextColor()
              }}
            />
            <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'category') {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    
    const chartData = data.map((item, index) => ({
      name: item.category,
      value: parseFloat(item.amount),
      color: item.color || colors[index % colors.length]
    }));

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => percent > 5 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']}
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#374151' : '#FFFFFF',
                border: `1px solid ${theme === 'dark' ? '#6B7280' : '#E5E7EB'}`,
                borderRadius: '6px',
                color: getTextColor()
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'weekly') {
    const chartData = data.map(item => ({
      day: item.day,
      amount: parseFloat(item.amount)
    }));

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={getGridColor()} />
            <XAxis dataKey="day" tick={{ fill: getTextColor(), fontSize: 12 }} />
            <YAxis tick={{ fill: getTextColor(), fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']}
              labelFormatter={(label) => `${label}`}
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#374151' : '#FFFFFF',
                border: `1px solid ${theme === 'dark' ? '#6B7280' : '#E5E7EB'}`,
                borderRadius: '6px',
                color: getTextColor()
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'monthly') {
    const chartData = data.map(item => ({
      month: item.month,
      expenses: parseFloat(item.expenses),
      income: parseFloat(item.income || 0)
    }));

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={getGridColor()} />
            <XAxis dataKey="month" tick={{ fill: getTextColor(), fontSize: 12 }} />
            <YAxis tick={{ fill: getTextColor(), fontSize: 12 }} />
            <Tooltip
              formatter={(value, name) => [`$${value.toFixed(2)}`, name === 'expenses' ? 'Expenses' : 'Income']}
              labelFormatter={(label) => `${label}`}
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#374151' : '#FFFFFF',
                border: `1px solid ${theme === 'dark' ? '#6B7280' : '#E5E7EB'}`,
                borderRadius: '6px',
                color: getTextColor()
              }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#EF4444"
              strokeWidth={3}
              dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
};

export default ExpenseChart;