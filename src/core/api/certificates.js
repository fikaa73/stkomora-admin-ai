/**
 * Certificates API – uses certificate + certificate_files tables.
 */
import apiClient from './client';

export const certificatesApi = {
  getList: () => apiClient.get('/certificates'),
  getById: (id) => apiClient.get(`/certificates/${id}`),
  create: (payload) => {
    const { user_id, files, titles = [], event_name, points } = payload;
    const formData = new FormData();
    formData.append('user_id', user_id);
    if (event_name != null && String(event_name).trim()) {
      formData.append('event_name', String(event_name).trim());
    }
    if (points != null && points !== '') {
      formData.append('points', points);
    }
    if (Array.isArray(files) && files.length > 0) {
      files.forEach((f) => formData.append('certificates[]', f instanceof File ? f : f.originFileObj || f));
      (Array.isArray(titles) ? titles : []).forEach((t, i) => {
        if (i < files.length) formData.append('titles[]', t ?? '');
      });
    }
    return apiClient.post('/certificates', formData);
  },
  addFile: (id, file, title = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (title != null && String(title).trim()) formData.append('title', String(title).trim());
    return apiClient.post(`/certificates/${id}/files`, formData);
  },
  removeFile: (id, fileId) => apiClient.delete(`/certificates/${id}/files/${fileId}`),
  fetchFileBlob: async (id, fileId, disposition = 'inline') => {
    const { data } = await apiClient.get(
      `/certificates/${id}/files/${fileId}/file`,
      { responseType: 'blob', params: { disposition } }
    );
    return data;
  },
  delete: (id) => apiClient.delete(`/certificates/${id}`),
};
