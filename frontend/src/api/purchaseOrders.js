import apiClient from './client';

export const purchaseOrdersApi = {
  listPurchaseOrders: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    );
    const response = await apiClient.get('/api/purchase-orders', { params: cleanParams });
    return response.data;
  },

  getPurchaseOrder: async (id) => {
    const response = await apiClient.get(`/api/purchase-orders/${id}`);
    return response.data;
  },

  createPurchaseOrder: async (orderData) => {
    const response = await apiClient.post('/api/purchase-orders', orderData);
    return response.data;
  },

  updatePurchaseOrder: async (id, orderData) => {
    const response = await apiClient.put(`/api/purchase-orders/${id}`, orderData);
    return response.data;
  },

  deletePurchaseOrder: async (id) => {
    const response = await apiClient.delete(`/api/purchase-orders/${id}`);
    return response.data;
  },

  approvePurchaseOrder: async (id) => {
    const response = await apiClient.post(`/api/purchase-orders/${id}/approve`);
    return response.data;
  },

  receivePurchaseOrder: async (id, receipts) => {
    const response = await apiClient.post(`/api/purchase-orders/${id}/receive`, {
      items: receipts,
    });
    return response.data;
  },

  cancelPurchaseOrder: async (id) => {
    const response = await apiClient.post(`/api/purchase-orders/${id}/cancel`);
    return response.data;
  },
};

export default purchaseOrdersApi;
