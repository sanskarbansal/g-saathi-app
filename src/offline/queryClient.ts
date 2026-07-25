import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { isApiError } from "@/api";

/**
 * The app's QueryClient. Reads are `offlineFirst` (serve cache, revalidate when
 * back online) and kept for 24h so the app is fully usable with no signal. 4xx
 * errors are never retried; transient errors get a couple of tries.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            networkMode: "offlineFirst",
            staleTime: 30_000,
            gcTime: 1000 * 60 * 60 * 24, // 24h — must exceed persister maxAge use
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
                if (isApiError(error) && error.status >= 400 && error.status < 500) {
                    return false; // auth/validation/conflict — retrying won't help
                }
                return failureCount < 2;
            },
        },
        mutations: {
            networkMode: "offlineFirst",
            retry: 0,
        },
    },
});

/** Persist the React Query cache to AsyncStorage (stale-while-revalidate offline). */
export const queryPersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: "saathi.rq-cache.v1",
    throttleTime: 1000,
});
