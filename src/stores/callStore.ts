import { create } from "zustand";
import { platformBus } from "@/app/events/platform-bus";

type CallMode = "idle" | "ringing" | "connecting" | "active" | "ended";
type CallType = "audio" | "video" | null;

type CallStore = {
  mode: CallMode;
  type: CallType;
  peerOrbitId: string | null;
  localMicEnabled: boolean;
  localCamEnabled: boolean;

  startCall: (peerOrbitId: string, type: "audio" | "video") => void;
  setConnecting: () => void;
  setActive: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCam: () => void;
};

export const useCallStore = create<CallStore>((set, get) => ({
  mode: "idle",
  type: null,
  peerOrbitId: null,
  localMicEnabled: true,
  localCamEnabled: true,

  startCall: (peerOrbitId, type) => {
    set({
      mode: "ringing",
      type,
      peerOrbitId,
      localMicEnabled: true,
      localCamEnabled: type === "video",
    });
    platformBus.emit({ type: "call.started", payload: { peerOrbitId, mode: type } });
  },

  setConnecting: () => set({ mode: "connecting" }),
  setActive: () => set({ mode: "active" }),

  endCall: () => {
    const peerOrbitId = get().peerOrbitId;
    set({
      mode: "ended",
      type: null,
      peerOrbitId: null,
      localMicEnabled: false,
      localCamEnabled: false,
    });
    platformBus.emit({ type: "call.ended", payload: { peerOrbitId } });
  },

  toggleMic: () => set((state) => ({ localMicEnabled: !state.localMicEnabled })),
  toggleCam: () => set((state) => ({ localCamEnabled: !state.localCamEnabled })),
}));
