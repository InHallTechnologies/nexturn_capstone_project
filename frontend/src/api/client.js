import axios from 'axios';

// Configurable API base URL (defaults to '' to leverage Vite proxy)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Request interceptor: attach current access token
apiClient.interceptors.request.use(
  (config) => {
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

// Response interceptor: handle 401 with atomic refresh token rotation
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints to prevent loops
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/login') &&
      !originalRequest.url?.includes('/api/auth/register') &&
      !originalRequest.url?.includes('/api/auth/refresh')
    ) {
      const refreshToken = localStorage.getItem('stockpilot_refresh_token');

      if (!refreshToken) {
        // No refresh token available; trigger logout
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Enqueue request while refresh is in flight
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
