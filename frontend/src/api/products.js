import apiClient from './client';

export const productsApi = {
  listProducts: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    );
    const response = await apiClient.get('/api/products', { params: cleanParams });
    return response.data;
  },

  getProduct: async (id) => {
    const response = await apiClient.get(`/api/products/${id}`);
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await apiClient.post('/api/products', productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await apiClient.put(`/api/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await apiClient.delete(`/api/products/${id}`);
    return response.data;
  },
};

export default productsApi;
