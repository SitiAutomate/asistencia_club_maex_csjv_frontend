import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';

export function AppProviders({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
