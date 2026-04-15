import { QueryClient } from '@tanstack/react-query';

/**
 * Caché agresivo pero con datos “frescos” al volver a la pestaña / reconexión.
 * Para listados que varios usuarios consultan, en queries puntuales usa refetchInterval
 * o invalidación tras mutaciones (useMutation → queryClient.invalidateQueries).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
