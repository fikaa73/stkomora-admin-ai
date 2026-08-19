/**
 * Finances API.
 */
import apiClient from './client';

export const financesApi = {
  getList: (params) => apiClient.get('/finances', { params }),
  getProcessors: () => apiClient.get('/finances/processors'),
  getById: (id) => apiClient.get(`/finances/${id}`),
  getMemberDetails: (memberId) => apiClient.get(`/finances/member/${memberId}`),
  create: (data) => apiClient.post('/finances', data),
  update: (id, data) => apiClient.put(`/finances/${id}`, data),
  delete: (id) => apiClient.delete(`/finances/${id}`),
};
