import apiClient from './client';

export const salesApi = {
  listSales: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    );
    const response = await apiClient.get('/api/sales', { params: cleanParams });
    return response.data;
  },

  getSale: async (id) => {
    const response = await apiClient.get(`/api/sales/${id}`);
    return response.data;
  },

  createSale: async (saleData) => {
    const response = await apiClient.post('/api/sales', saleData);
    return response.data;
  },
};

export default salesApi;
