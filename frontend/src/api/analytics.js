import apiClient from './client';

// Analytics API
export const analyticsAPI = {
  getMonthlyTotals: (params) => apiClient.get('analytics/monthly/', { params }),
  getTotalsByCompany: (params) => apiClient.get('analytics/by-company/', { params }),
  getTotalsByPaymentForm: (params) => apiClient.get('analytics/by-payment-form/', { params }),
  getTotalsByExpenseType: (params) => apiClient.get('analytics/by-expense-type/', { params }),
  getSummary: (params) => apiClient.get('analytics/summary/', { params }),
};
