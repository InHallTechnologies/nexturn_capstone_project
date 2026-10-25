import apiClient from './client';

export const suppliersApi = {
  listSuppliers: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    );
    const response = await apiClient.get('/api/suppliers', { params: cleanParams });
    return response.data;
  },

  getSupplier: async (id) => {
    const response = await apiClient.get(`/api/suppliers/${id}`);
    return response.data;
  },

  getSupplierPurchaseOrders: async (supplierId, params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    );
    const response = await apiClient.get(`/api/suppliers/${supplierId}/purchase-orders`, {
      params: cleanParams,
    });
    return response.data;
  },

  createSupplier: async (supplierData) => {
    const response = await apiClient.post('/api/suppliers', supplierData);
    return response.data;
  },

  updateSupplier: async (id, supplierData) => {
    const response = await apiClient.put(`/api/suppliers/${id}`, supplierData);
    return response.data;
  },

  deleteSupplier: async (id) => {
    const response = await apiClient.delete(`/api/suppliers/${id}`);
    return response.data;
  },
};

export default suppliersApi;
