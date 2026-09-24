"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// Bump when a cached response shape changes incompatibly, to drop old
// persisted caches on deploy instead of rendering against a stale shape.
const CACHE_BUSTER = "v1";
const PERSISTED_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Must be >= persistOptions.maxAge, or entries get garbage
            // collected client-side before they'd otherwise be persisted.
            gcTime: PERSISTED_CACHE_MAX_AGE,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  // localStorage doesn't exist during SSR; this component still runs
  // server-side for the initial render, so the persister can only be built
  // once mounted in the browser.
  const [persister] = useState(() =>
    typeof window === "undefined"
      ? null
      : createSyncStoragePersister({
          storage: window.localStorage,
          key: "eos-query-cache",
        }),
  );

  if (!persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSISTED_CACHE_MAX_AGE,
        buster: CACHE_BUSTER,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
