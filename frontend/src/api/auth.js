import apiClient from './client';

export const authApi = {
  login: async (email, password) => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    return response.data;
  },

  register: async (name, email, password) => {
    const response = await apiClient.post('/api/auth/register', { name, email, password });
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  logout: async (refreshToken) => {
    const response = await apiClient.post('/api/auth/logout', {
      refresh_token: refreshToken || localStorage.getItem('stockpilot_refresh_token'),
    });
    return response.data;
  },

  refresh: async (refreshToken) => {
    const response = await apiClient.post('/api/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },
};

export default authApi;
