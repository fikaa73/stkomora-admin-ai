/**
 * React Query hooks za oslobođenja od članarine.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exemptionsApi } from '../core/api/exemptions';

const EXEMPTIONS_KEY = ['exemptions'];

export function useMemberExemptions(memberId) {
  return useQuery({
    queryKey: [...EXEMPTIONS_KEY, memberId],
    queryFn: async () => {
      const { data } = await exemptionsApi.getForMember(memberId);
      return data;
    },
    enabled: !!memberId,
  });
}

export function useAddExemption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, payload }) => exemptionsApi.create(memberId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...EXEMPTIONS_KEY, variables.memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

/**
 * Poništavanje članarina koje su već zadužene u periodu oslobođenja.
 * Mijenja i finansijsku karticu člana, pa se osvježavaju i 'finances'.
 */
export function useClearExemptionCharges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, id }) => exemptionsApi.clearCharges(memberId, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...EXEMPTIONS_KEY, variables.memberId] });
      queryClient.invalidateQueries({ queryKey: [...EXEMPTIONS_KEY, 'pending-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}

/** Svi članovi kojima oslobođenje pokriva već zadužene mjesece. */
export function usePendingCorrections(enabled = true) {
  return useQuery({
    queryKey: [...EXEMPTIONS_KEY, 'pending-corrections'],
    queryFn: async () => {
      const { data } = await exemptionsApi.pendingCorrections();
      return data;
    },
    enabled,
  });
}

export function useUpdateExemption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, id, payload }) => exemptionsApi.update(memberId, id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...EXEMPTIONS_KEY, variables.memberId] });
      queryClient.invalidateQueries({ queryKey: [...EXEMPTIONS_KEY, 'pending-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useDeleteExemption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, id }) => exemptionsApi.delete(memberId, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...EXEMPTIONS_KEY, variables.memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
