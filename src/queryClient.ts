import { QueryClient } from "@tanstack/react-query";

/** One client for the app: no automatic retries or refetch on focus (pages load as the Django ones did). */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
