import { onlineManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";

/**
 * Bridge React Query's `onlineManager` to NetInfo so queries pause offline and
 * refetch/flush on reconnect. Call once at app start.
 */
export function initOnlineManager(): void {
    onlineManager.setEventListener((setOnline) => {
        const sub = NetInfo.addEventListener((state) => {
            const online =
                Boolean(state.isConnected) && state.isInternetReachable !== false;
            setOnline(online);
        });
        return () => sub();
    });
}

export { onlineManager };
