import apiClient from './client';

export const stockMovementsApi = {
  listStockMovements: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    );
    const response = await apiClient.get('/api/stock-movements', { params: cleanParams });
    return response.data;
  },

  createAdjustment: async ({ product_id, quantity, notes }) => {
    const response = await apiClient.post('/api/stock-movements/adjustments', {
      product_id: Number(product_id),
      quantity: Number(quantity),
      notes: notes.trim(),
    });
    return response.data;
  },
};

export default stockMovementsApi;
