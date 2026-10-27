import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const GET_CACHE_TTL = 30000;
const MAX_CACHE_ENTRIES = 100;
const getCache = new Map();
const pendingGets = new Map();
let cacheGeneration = 0;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const originalGet = apiClient.get.bind(apiClient);

const requestKey = (url, config = {}) => {
  const params = new URLSearchParams();
  Object.entries(config.params || {})
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => params.set(key, String(value)));
  return `${url}?${params}`;
};

apiClient.get = (url, config = {}) => {
  const key = requestKey(url, config);
  const cached = getCache.get(key);
  if (cached && Date.now() - cached.createdAt < GET_CACHE_TTL) {
    return Promise.resolve(cached.response);
  }

  const pending = pendingGets.get(key);
  if (pending) {
    return pending;
  }

  const generation = cacheGeneration;
  const request = originalGet(url, config)
    .then((response) => {
      if (generation === cacheGeneration) {
        if (getCache.size >= MAX_CACHE_ENTRIES) {
          getCache.clear();
        }
        getCache.set(key, { response, createdAt: Date.now() });
      }
      return response;
    })
    .finally(() => {
      if (pendingGets.get(key) === request) {
        pendingGets.delete(key);
      }
    });

  pendingGets.set(key, request);
  return request;
};

export const clearApiCache = () => {
  cacheGeneration += 1;
  getCache.clear();
  pendingGets.clear();
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use(
  (config) => {
    if (config.method && config.method.toLowerCase() !== 'get') {
      clearApiCache();
    }

    const token = localStorage.getItem('stockpilot_access_token');
    if (config.url?.includes('/api/auth/refresh')) {
      delete config.headers.Authorization;
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/login') &&
      !originalRequest.url?.includes('/api/auth/register') &&
      !originalRequest.url?.includes('/api/auth/refresh')
    ) {
      const refreshToken = localStorage.getItem('stockpilot_refresh_token');

      if (!refreshToken) {
        clearApiCache();
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken, token } = response.data;
        const newAccessToken = access_token || token;

        localStorage.setItem('stockpilot_access_token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('stockpilot_refresh_token', newRefreshToken);
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearApiCache();
        processQueue(refreshError, null);
        localStorage.removeItem('stockpilot_access_token');
        localStorage.removeItem('stockpilot_refresh_token');
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
