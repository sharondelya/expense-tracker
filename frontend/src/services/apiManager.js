import api from './api';

class APIManager {
  constructor() {
    this.requestCache = new Map();
    this.pendingRequests = new Map();
    this.retryDelays = [2000, 5000, 10000]; // Longer delays for rate limiting
    this.globalRequestQueue = [];
    this.isProcessingQueue = false;
    this.maxConcurrentRequests = 2; // Reduce concurrent requests
  }

  // Generate cache key for requests
  generateCacheKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    return `${url}?${JSON.stringify(sortedParams)}`;
  }

  // Check if request is already pending
  isPending(cacheKey) {
    return this.pendingRequests.has(cacheKey);
  }

  // Get cached response if available and not expired
  getCachedResponse(cacheKey, maxAge = 120000) { // 2 minutes default - much longer
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.data;
    }
    return null;
  }

  // Cache response
  cacheResponse(cacheKey, data) {
    this.requestCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  // Sleep utility for retry delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Process request queue to limit concurrent requests
  async processQueue() {
    if (this.isProcessingQueue || this.globalRequestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.globalRequestQueue.length > 0) {
      // Process requests in batches
      const batch = this.globalRequestQueue.splice(0, this.maxConcurrentRequests);
      
      // Execute all requests in the current batch
      const batchPromises = batch.map(requestInfo => this._executeRequestInternal(requestInfo));
      
      // Wait for all requests in the batch to complete
      await Promise.allSettled(batchPromises);

      // Add delay between batches to avoid overwhelming the server
      if (this.globalRequestQueue.length > 0) {
        await this.sleep(500); // 500ms delay between batches
      }
    }

    this.isProcessingQueue = false;
  }

  // Execute request with queue management
  async _executeRequestInternal(requestInfo) {
    const { url, params, resolve, reject } = requestInfo;
    try {
      const response = await api.get(url, { params });
      resolve(response.data);
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      reject(error);
    }
  }

  // Make request with retry logic and caching
  async makeRequest(url, options = {}, retryCount = 0) {
    const { params = {}, maxAge = 120000, skipCache = false } = options;
    const cacheKey = this.generateCacheKey(url, params);

    // Return cached response if available
    if (!skipCache) {
      const cached = this.getCachedResponse(cacheKey, maxAge);
      if (cached) {
        console.log(`Cache hit for ${url}`);
        return cached;
      }
    }

    // Return pending request if already in progress
    if (this.isPending(cacheKey)) {
      console.log(`Request already pending for ${url}`);
      return this.pendingRequests.get(cacheKey);
    }

    // Create new request promise
    const requestPromise = new Promise((resolve, reject) => {
      this.globalRequestQueue.push({ url, params, resolve, reject });
      this.processQueue();
    });

    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;
      this.cacheResponse(cacheKey, response);
      console.log(`Request completed for ${url}`);
      return response;
    } catch (error) {
      // Handle rate limiting with exponential backoff
      if (error.response?.status === 429 && retryCount < this.retryDelays.length) {
        const delay = this.retryDelays[retryCount];
        console.warn(`Rate limited. Retrying in ${delay}ms... (attempt ${retryCount + 1})`);
        await this.sleep(delay);
        return this.makeRequest(url, options, retryCount + 1);
      }
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // PATCH request method
  async patch(url, data, options = {}) {
    try {
      const response = await api.patch(url, data, options);
      return response.data;
    } catch (error) {
      console.error(`PATCH request failed: ${url}`, error);
      throw error;
    }
  }

  // PUT request method
  async put(url, data, options = {}) {
    try {
      const response = await api.put(url, data, options);
      return response.data;
    } catch (error) {
      console.error(`PUT request failed: ${url}`, error);
      throw error;
    }
  }

  // DELETE request method
  async delete(url, options = {}) {
    try {
      const response = await api.delete(url, options);
      return response.data;
    } catch (error) {
      console.error(`DELETE request failed: ${url}`, error);
      throw error;
    }
  }

  // POST request method
  async post(url, data, options = {}) {
    try {
      const response = await api.post(url, data, options);
      return response.data;
    } catch (error) {
      console.error(`POST request failed: ${url}`, error);
      throw error;
    }
  }

  // Invalidate cache for a specific URL pattern
  invalidateCache(urlPattern) {
    const keysToDelete = [];
    for (const [key] of this.requestCache.entries()) {
      if (key.includes(urlPattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.requestCache.delete(key));
  }

  // Batch multiple requests with controlled concurrency and delays
  async batchRequests(requests, concurrency = 2) {
    const results = [];
    
    // Process requests in smaller batches with delays
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (request) => {
        try {
          // Handle both 'url' and 'endpoint' properties for backward compatibility
          const requestUrl = request.url || request.endpoint;
          if (!requestUrl) {
            throw new Error('Request must have either url or endpoint property');
          }
          const data = await this.makeRequest(requestUrl, request.options);
          return { success: true, data, url: requestUrl };
        } catch (error) {
          const requestUrl = request.url || request.endpoint || 'undefined';
          return { success: false, error, url: requestUrl };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to avoid overwhelming the server
      if (i + concurrency < requests.length) {
        await this.sleep(1000); // 1 second delay between batches
      }
    }

    return results;
  }

  // Clear cache
  clearCache() {
    this.requestCache.clear();
  }

  // Clear expired cache entries
  clearExpiredCache(maxAge = 300000) { // 5 minutes default
    const now = Date.now();
    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.requestCache.delete(key);
      }
    }
  }
}

// Create singleton instance
const apiManager = new APIManager();

// Clear expired cache every 5 minutes
setInterval(() => {
  apiManager.clearExpiredCache();
}, 300000);

export default apiManager;
