/**
 * React Query hooks for congress registrations (Kongres).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { congressApi } from '../core/api/congress';

const CONGRESS_QUERY_KEY = ['congress'];

export function useCongress() {
  return useQuery({
    queryKey: CONGRESS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await congressApi.getList();
      return data;
    },
  });
}

export function useCongressPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payment }) => congressApi.payment(id, payment),
    onSuccess: (res, vars) => {
      // Backend na PUT /payment vraca cijelu listu - iskoristi je odmah,
      // umjesto da invalidacija izazove jos jedan GET /congress.
      // Kod stikliranja desetina uplata sa izvoda to prepolovi broj poziva.
      const lista = Array.isArray(res?.data) ? res.data : null;
      if (!lista) {
        queryClient.invalidateQueries({ queryKey: CONGRESS_QUERY_KEY });
        return;
      }
      queryClient.setQueryData(CONGRESS_QUERY_KEY, (staro) => {
        if (!Array.isArray(staro)) return lista;
        // Primijeni SAMO red koji je ova izmjena dirala. Kod brzog stikliranja
        // vise zahtjeva je u letu i odgovori mogu stici obrnutim redom - da
        // upisujemo cijelu listu, stariji odgovor bi ponistio noviju kvacicu.
        const svjez = lista.find((r) => r.id === vars.id);
        return staro.map((r) => (r.id === vars.id ? svjez ?? { ...r, paid: vars.payment } : r));
      });
    },
  });
}

export function useDeleteCongressParticipant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => congressApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONGRESS_QUERY_KEY }),
  });
}
