import { crossTabSync, TAB_SYNC_CHANNELS } from "@/lib/cross-tab-sync";

let installed = false;

export function installCrossTabSubscribers(): void {
  if (installed) return;
  installed = true;

  crossTabSync.subscribe(TAB_SYNC_CHANNELS.WALLET_BALANCE, (data) => {
    const payload = data as { balance?: number; currency?: string } | null;
    if (payload?.balance == null) return;
    import("@/stores/walletStore").then(({ useWalletStore }) => {
      const state = useWalletStore.getState();
      if (state.wallet && state.wallet.balance !== payload.balance) {
        useWalletStore.setState({
          wallet: { ...state.wallet, balance: payload.balance! },
        });
      }
    }).catch(() => {});
  });

  crossTabSync.subscribe(TAB_SYNC_CHANNELS.NOTIFICATION_COUNT, (data) => {
    const payload = data as { count?: number } | null;
    if (payload?.count == null) return;
    import("@/stores/notification.store").then(({ useNotificationStore }) => {
      const current = useNotificationStore.getState().unreadCount;
      if (current !== payload.count) {
        useNotificationStore.setState({ unreadCount: payload.count! });
      }
    }).catch(() => {});
  });

  crossTabSync.subscribe(TAB_SYNC_CHANNELS.ORBIT_UNREAD, (data) => {
    const payload = data as {
      count?: number;
      conversationId?: string;
      perConversation?: Record<string, number>;
    } | null;
    if (payload?.count == null) return;
    import("@/domains/orbit/stores/orbit.store").then((mod) => {
      const store = mod.useOrbitMessagingStore;
      if (!store) return;
      const state = store.getState();
      if (payload.conversationId) {
        const conv = state.conversations[payload.conversationId];
        if (conv && conv.unreadCount !== payload.count) {
          store.getState().updateUnreadCount(payload.conversationId, payload.count!);
        }
      } else if (payload.perConversation) {
        for (const [convId, count] of Object.entries(payload.perConversation)) {
          const conv = state.conversations[convId];
          if (conv && conv.unreadCount !== count) {
            store.getState().updateUnreadCount(convId, count);
          }
        }
      } else if (payload.count === 0) {
        for (const convId of Object.keys(state.conversations)) {
          if (state.conversations[convId].unreadCount > 0) {
            store.getState().updateUnreadCount(convId, 0);
          }
        }
      }
    }).catch(() => {});
  });

  crossTabSync.subscribe(TAB_SYNC_CHANNELS.AUTH_STATE, (data) => {
    const payload = data as { event?: string } | null;
    if (payload?.event === "SIGNED_OUT") {
      import("@/stores/walletStore").then(({ useWalletStore }) => {
        useWalletStore.setState({ wallet: null, transactions: [], loading: false, error: null });
      }).catch(() => {});
      import("@/stores/notification.store").then(({ useNotificationStore }) => {
        useNotificationStore.getState().clear();
      }).catch(() => {});
    }
  });
}
