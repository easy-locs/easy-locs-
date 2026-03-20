import { create } from "zustand";
import type { RealtimeSubscriptionRef } from "@/lib/types/realtime";

type RealtimeStore = {
  subscriptions: RealtimeSubscriptionRef[];
  addSubscription: (sub: RealtimeSubscriptionRef) => void;
  removeSubscription: (key: string) => void;
  clearSubscriptions: () => void;
};

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  subscriptions: [],
  addSubscription: (sub) =>
    set((state) => ({
      subscriptions: state.subscriptions.some((s) => s.key === sub.key)
        ? state.subscriptions
        : [sub, ...state.subscriptions],
    })),
  removeSubscription: (key) =>
    set((state) => ({
      subscriptions: state.subscriptions.filter((s) => s.key !== key),
    })),
  clearSubscriptions: () => set({ subscriptions: [] }),
}));
