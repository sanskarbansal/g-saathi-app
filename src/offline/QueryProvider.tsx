import React from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { queryClient, queryPersister } from "./queryClient";

/**
 * Wraps the app with a QueryClient whose cache is persisted to AsyncStorage, so
 * Home / Stores / Score render instantly from cache on cold start and offline.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: queryPersister, maxAge: 1000 * 60 * 60 * 24 }}
        >
            {children}
        </PersistQueryClientProvider>
    );
}
