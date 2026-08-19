/**
 * React Query hooks for finances.
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { financesApi } from '../core/api/finances';

const FINANCES_QUERY_KEY = ['finances'];

/**
 * Lista finansija. Sa server-side paginacijom kada se prosledi { page, per_page, ... }
 * -> vraca { data, total, current_page, per_page, last_page }.
 * Bez parametara backend vraca cijelu listu (niz) radi unazad-kompatibilnosti.
 */
export function useFinances(params = {}) {
  return useQuery({
    queryKey: [...FINANCES_QUERY_KEY, 'list', params],
    queryFn: async () => {
      const { data } = await financesApi.getList(params);
      return data;
    },
    placeholderData: keepPreviousData, // tabela ne "trepce" pri promjeni strane/filtera
  });
}

/** Distinct lista obradjivaca za filter dropdown. */
export function useFinanceProcessors() {
  return useQuery({
    queryKey: [...FINANCES_QUERY_KEY, 'processors'],
    queryFn: async () => {
      const { data } = await financesApi.getProcessors();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useFinance(id) {
  return useQuery({
    queryKey: [...FINANCES_QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await financesApi.getById(id);
      return data;
    },
    enabled: !!id,
  });
}

export function useMemberFinanceDetails(memberId) {
  return useQuery({
    queryKey: [...FINANCES_QUERY_KEY, 'member', memberId],
    queryFn: async () => {
      const { data } = await financesApi.getMemberDetails(memberId);
      return data;
    },
    enabled: !!memberId,
  });
}

export function useAddFinance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (finance) => financesApi.create(finance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCES_QUERY_KEY });
    },
  });
}

export function useUpdateFinance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => financesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: FINANCES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...FINANCES_QUERY_KEY, variables.id] });
    },
  });
}

export function useDeleteFinance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => financesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCES_QUERY_KEY });
    },
  });
}
