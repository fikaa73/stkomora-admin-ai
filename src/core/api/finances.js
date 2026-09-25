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

  /** Mjeseci za koje postoji obračun članarine (za padajući meni). */
  getReportPeriods: () => apiClient.get('/finances/monthly-report'),

  /** Excel (.xlsx) izvještaj o članarini za zadati mjesec — šalje se knjigovodstvenoj agenciji. */
  downloadMonthlyReport: async (period) => {
    const { data } = await apiClient.get('/finances/monthly-report', {
      params: { period },
      responseType: 'blob',
    });
    return data;
  },
};
