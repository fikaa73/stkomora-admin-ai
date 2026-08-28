/**
 * React Query hooks for members (server state).
 * Queries and mutations invalidate cache as needed.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi, citiesApi } from '../core/api/members';

const MEMBERS_QUERY_KEY = ['members'];
const CITIES_QUERY_KEY = ['cities'];

// Normalizuje API odgovor: snake_case primary_company -> camelCase primaryCompany
function normalizeMember(m) {
  if (!m || typeof m !== 'object') return m;
  return {
    ...m,
    primaryCompany: m.primaryCompany ?? m.primary_company ?? null,
  };
}

export function useMembers() {
  return useQuery({
    queryKey: MEMBERS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await membersApi.getList();
      return Array.isArray(data) ? data.map(normalizeMember) : data;
    },
  });
}

export function useMember(id) {
  return useQuery({
    queryKey: [...MEMBERS_QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await membersApi.getById(id);
      return normalizeMember(data);
    },
    enabled: !!id,
  });
}

export function useCities() {
  return useQuery({
    queryKey: CITIES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await citiesApi.getList();
      return data;
    },
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (member) => membersApi.create(member),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, ...rest }) => {
      const payload = data !== undefined ? data : rest;
      return membersApi.update(id, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...MEMBERS_QUERY_KEY, variables.id] });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => membersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });
    },
  });
}

// Izmjena samo "napomena" (iz forme clana i iz finansija).
export function useUpdateMemberNapomena() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, napomena }) => membersApi.updateNapomena(id, napomena),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...MEMBERS_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['finances'] }); // refresh finance member details
    },
  });
}
