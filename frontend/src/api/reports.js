import apiClient from './client';

export const reportsApi = {
  getLowStockReport: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    );
    const response = await apiClient.get('/api/reports/low-stock', { params: cleanParams });
    return response.data;
  },

  getValuationReport: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    );
    const response = await apiClient.get('/api/reports/valuation', { params: cleanParams });
    return response.data;
  },

  getLedgerBalanceReport: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    );
    const response = await apiClient.get('/api/reports/ledger-balance', { params: cleanParams });
    return response.data;
  },

  getSalesByDayReport: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    );
    const response = await apiClient.get('/api/reports/sales-by-day', { params: cleanParams });
    return response.data;
  },
};

export default reportsApi;
