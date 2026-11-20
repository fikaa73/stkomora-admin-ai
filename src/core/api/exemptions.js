/**
 * Membership fee exemptions API (oslobođenja od plaćanja članarine).
 * Nested pod /member/{memberId}/exemptions.
 */
import apiClient from './client';

export const exemptionsApi = {
  getForMember: (memberId) => apiClient.get(`/member/${memberId}/exemptions`),
  create: (memberId, payload) => {
    const formData = new FormData();
    formData.append('start_period', payload.start_period);
    formData.append('months', payload.months);
    if (payload.note != null && String(payload.note).trim()) {
      formData.append('note', String(payload.note).trim());
    }
    if (payload.document) {
      formData.append('document', payload.document);
    }
    return apiClient.post(`/member/${memberId}/exemptions`, formData);
  },
  // Izmjena perioda: FormData + _method, jer PUT sa fajlom ne prolazi kroz pregledac.
  update: (memberId, id, payload) => {
    const formData = new FormData();
    formData.append('_method', 'PUT');
    formData.append('start_period', payload.start_period);
    formData.append('months', payload.months);
    if (payload.note != null) {
      formData.append('note', String(payload.note).trim());
    }
    if (payload.document) {
      formData.append('document', payload.document);
    }
    return apiClient.post(`/member/${memberId}/exemptions/${id}`, formData);
  },
  // Sta bi se promijenilo na kartici — prikazuje se u potvrdi prije snimanja.
  preview: (memberId, payload) =>
    apiClient.post(`/member/${memberId}/exemptions/preview`, payload),
  delete: (memberId, id) => apiClient.delete(`/member/${memberId}/exemptions/${id}`),
  // Oslobođenje upisano unazad: poništi članarine koje su već zadužene u njegovom periodu.
  clearCharges: (memberId, id) =>
    apiClient.post(`/member/${memberId}/exemptions/${id}/clear-charges`),
  // Svi članovi kojima oslobođenje pokriva već zadužene mjesece.
  pendingCorrections: () => apiClient.get('/exemptions/pending-corrections'),
  fetchDocumentBlob: async (memberId, id, disposition = 'inline') => {
    const { data } = await apiClient.get(
      `/member/${memberId}/exemptions/${id}/document`,
      { responseType: 'blob', params: { disposition } }
    );
    return data;
  },
};
