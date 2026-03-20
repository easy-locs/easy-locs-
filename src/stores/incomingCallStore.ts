import { create } from "zustand";

type IncomingCallStore = {
  incoming: {
    sessionId: string;
    callerOrbitId: string;
    mode: "audio" | "video";
  } | null;
  setIncoming: (call: IncomingCallStore["incoming"]) => void;
  clearIncoming: () => void;
};

export const useIncomingCallStore = create<IncomingCallStore>((set) => ({
  incoming: null,
  setIncoming: (call) => set({ incoming: call }),
  clearIncoming: () => set({ incoming: null }),
}));
