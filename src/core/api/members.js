/**
 * Members API – all server calls for members (and cities).
 * Used by React Query hooks; no Redux.
 */
import apiClient from './client';

export const membersApi = {
  getList: () => apiClient.get('/member', { params: { all: 1 } }),
  getById: (id) => apiClient.get(`/member/${id}`),
  create: (data) => apiClient.post('/member', data),
  update: (id, data) => {
    if (data instanceof FormData) {
      return apiClient.post(`/member/${id}`, data);
    }
    return apiClient.put(`/member/${id}`, { ...data, id });
  },
  delete: (id) => apiClient.delete(`/member/${id}`),
  updateNapomena: (id, napomena) => apiClient.put(`/member/${id}/napomena`, { napomena }),
};

export const citiesApi = {
  getList: () => apiClient.get('/cities'),
};
