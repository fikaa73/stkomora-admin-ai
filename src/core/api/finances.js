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

  /**
   * Excel (.xlsx) „Izvještaj za finansije — pregled članarina" za period od–do (YYYY-MM).
   * Sadrži promet u periodu po članu; početno stanje ne ulazi.
   */
  downloadClanarinaOverview: async (from, to) => {
    const { data } = await apiClient.get('/finances/clanarina-overview', {
      params: { from, to },
      responseType: 'blob',
    });
    return data;
  },

  /**
   * Excel (.xlsx) „Početno stanje — dug po članovima na dan" (podrazumijevano 31.12.2025).
   * Dopuna pregleda članarina: onaj daje promet u periodu, ovaj stanje koje je u period ušlo.
   * changedSince je opcion — od kog datuma se stavka smatra naknadno unijetom.
   */
  downloadPocetnoStanje: async (asOf, changedSince) => {
    const { data } = await apiClient.get('/finances/pocetno-stanje', {
      params: changedSince ? { as_of: asOf, changed_since: changedSince } : { as_of: asOf },
      responseType: 'blob',
    });
    return data;
  },

  /** Excel (.xlsx) izvještaj o članarini za zadati mjesec — šalje se knjigovodstvenoj agenciji. */
  downloadMonthlyReport: async (period) => {
    const { data } = await apiClient.get('/finances/monthly-report', {
      params: { period },
      responseType: 'blob',
    });
    return data;
  },
};
