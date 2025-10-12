import apiClient from './client';

// Company API
export const companyAPI = {
  getAll: () => apiClient.get('companies/'),
  get: (id) => apiClient.get(`companies/${id}/`),
  create: (data) => apiClient.post('companies/', data),
  update: (id, data) => apiClient.put(`companies/${id}/`, data),
  delete: (id) => apiClient.delete(`companies/${id}/`),
};

// Payment Form API
export const paymentFormAPI = {
  getAll: () => apiClient.get('payment-forms/'),
  get: (id) => apiClient.get(`payment-forms/${id}/`),
  create: (data) => apiClient.post('payment-forms/', data),
  update: (id, data) => apiClient.put(`payment-forms/${id}/`, data),
  delete: (id) => apiClient.delete(`payment-forms/${id}/`),
};

// Expense Type API
export const expenseTypeAPI = {
  getAll: () => apiClient.get('expense-types/'),
  get: (id) => apiClient.get(`expense-types/${id}/`),
  create: (data) => apiClient.post('expense-types/', data),
  update: (id, data) => apiClient.put(`expense-types/${id}/`, data),
  delete: (id) => apiClient.delete(`expense-types/${id}/`),
};

// Expense API
export const expenseAPI = {
  getAll: (params) => apiClient.get('expenses/', { params }),
  get: (id) => apiClient.get(`expenses/${id}/`),
  create: (data) => apiClient.post('expenses/', data),
  update: (id, data) => apiClient.put(`expenses/${id}/`, data),
  delete: (id) => apiClient.delete(`expenses/${id}/`),
};
