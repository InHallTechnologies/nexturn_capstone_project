import apiClient from './client';

export const categoriesApi = {
  listCategories: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    );
    const response = await apiClient.get('/api/categories', { params: cleanParams });
    return response.data;
  },

  getCategory: async (id) => {
    const response = await apiClient.get(`/api/categories/${id}`);
    return response.data;
  },

  createCategory: async (categoryData) => {
    const response = await apiClient.post('/api/categories', categoryData);
    return response.data;
  },

  updateCategory: async (id, categoryData) => {
    const response = await apiClient.put(`/api/categories/${id}`, categoryData);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await apiClient.delete(`/api/categories/${id}`);
    return response.data;
  },
};

export default categoriesApi;
