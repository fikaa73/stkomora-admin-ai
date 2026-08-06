/**
 * Congress (Kongres) registrations API – used by React Query hooks.
 */
import apiClient from './client';

const BASE = 'https://api.stomkomcg.me';

export const congressApi = {
  getList: () => apiClient.get('/congress'),
  delete: (id) => apiClient.delete(`/congress/${id}`),
  /** Toggle payment: payment is 0 or 1 */
  payment: (id, payment) => apiClient.put(`/payment/${id}/${payment}`),
};

/** Base URL for congress file links (e.g. uploaded papers) */
export function getCongressFileUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${BASE}/${path.replace(/^\//, '')}`;
}
