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
  delete: (memberId, id) => apiClient.delete(`/member/${memberId}/exemptions/${id}`),
  fetchDocumentBlob: async (memberId, id, disposition = 'inline') => {
    const { data } = await apiClient.get(
      `/member/${memberId}/exemptions/${id}/document`,
      { responseType: 'blob', params: { disposition } }
    );
    return data;
  },
};
