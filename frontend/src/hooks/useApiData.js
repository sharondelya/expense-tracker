import { useState, useEffect, useCallback, useMemo } from 'react';
import apiManager from '../services/apiManager';
import toast from 'react-hot-toast';

export const useApiData = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    params = {},
    dependencies = [],
    maxAge = 120000, // 2 minutes default cache
    skipCache = false,
    onSuccess,
    onError,
    showErrorToast = true
  } = options;

  const fetchData = useCallback(async () => {
    if (!url) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiManager.makeRequest(url, {
        params,
        maxAge,
        skipCache
      });
      
      setData(response);
      if (onSuccess) onSuccess(response);
    } catch (err) {
      setError(err);
      if (showErrorToast) {
        if (err.response?.status === 429) {
          toast.error('Too many requests. Please wait a moment and try again.');
        } else {
          toast.error(`Failed to load data: ${err.message}`);
        }
      }
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(params), maxAge, skipCache, showErrorToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch
  };
};

export const useBatchApiData = (requests, options = {}) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const {
    dependencies = [],
    concurrency = 1, // Very low concurrency to avoid rate limiting
    showErrorToast = true
  } = options;

  // Memoize the requests to prevent infinite re-renders
  const stableRequests = useMemo(() => requests, [JSON.stringify(requests)]);

  const fetchData = useCallback(async () => {
    if (!stableRequests || stableRequests.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      
      const results = await apiManager.batchRequests(stableRequests, concurrency);
      
      const newData = {};
      const newErrors = {};
      
      results.forEach((result, index) => {
        const request = stableRequests[index];
        const key = request.key || request.url;
        
        if (result.success) {
          newData[key] = result.data;
        } else {
          newErrors[key] = result.error;
          if (showErrorToast) {
            if (result.error.response?.status === 429) {
              toast.error(`Rate limited: ${key}`);
            } else {
              toast.error(`Failed to load ${key}: ${result.error.message}`);
            }
          }
        }
      });
      
      setData(newData);
      setErrors(newErrors);
    } catch (err) {
      console.error('Batch request failed:', err);
      if (showErrorToast) {
        toast.error('Failed to load data');
      }
      setErrors({ general: err });
    } finally {
      setLoading(false);
    }
  }, [stableRequests, concurrency, showErrorToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    errors,
    refetch
  };
};

// Hook for dashboard data that needs multiple API calls
export const useDashboardData = (params = {}) => {
  const requests = [
    {
      key: 'stats',
      url: '/expenses/stats',
      options: { params, maxAge: 300000 } // Cache for 5 minutes
    },
    {
      key: 'categories',
      url: '/categories',
      options: { maxAge: 600000 } // Cache for 10 minutes
    },
    {
      key: 'recentExpenses',
      url: '/expenses',
      options: { params: { ...params, limit: 10 }, maxAge: 180000 } // Cache for 3 minutes
    }
  ];

  return useBatchApiData(requests, {
    dependencies: [JSON.stringify(params)],
    concurrency: 1 // Sequential requests to avoid rate limiting
  });
};

// Hook for analytics data
export const useAnalyticsData = (timeRange = 'month') => {
  const requests = [
    {
      key: 'overview',
      url: `/analytics/overview`,
      options: { params: { timeRange }, maxAge: 300000 } // Cache for 5 minutes
    },
    {
      key: 'categories',
      url: `/analytics/categories`,
      options: { params: { timeRange }, maxAge: 300000 }
    },
    {
      key: 'trends',
      url: `/analytics/trends`,
      options: { params: { timeRange }, maxAge: 300000 }
    },
    {
      key: 'topExpenses',
      url: `/analytics/top-expenses`,
      options: { params: { timeRange }, maxAge: 300000 }
    }
  ];

  return useBatchApiData(requests, {
    dependencies: [timeRange],
    concurrency: 1 // Sequential requests to avoid rate limiting
  });
};

export default useApiData;
