/**
 * FAMILY: CALLS TAB — Canonical call history state, filters, actions.
 * Single source of truth for the Calls tab runtime.
 */
import { create } from "zustand";

type CallsFilter = "all" | "missed" | "incoming" | "outgoing";

interface CallsTabState {
  filter: CallsFilter;
  setFilter: (f: CallsFilter) => void;
  reset: () => void;
}

export const useCallsTabStore = create<CallsTabState>((set) => ({
  filter: "all",
  setFilter: (f) => set({ filter: f }),
  reset: () => set({ filter: "all" }),
}));

export const CallsTab = {
  /** Filter call history by type */
  applyFilter<T extends { call_type?: string; status?: string }>(
    calls: T[],
    filter: CallsFilter,
  ): T[] {
    switch (filter) {
      case "missed": return calls.filter(c => c.status === "missed");
      case "incoming": return calls.filter(c => c.call_type === "incoming");
      case "outgoing": return calls.filter(c => c.call_type === "outgoing");
      default: return calls;
    }
  },
};
