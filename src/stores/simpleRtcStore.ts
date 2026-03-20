import { create } from "zustand";
import { usePermissionStore } from "@/stores/permissionStore";

type SimpleRtcStore = {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isInitialized: boolean;

  initLocalMedia: (mode: "audio" | "video") => Promise<void>;
  cleanup: () => void;
};

export const useSimpleRtcStore = create<SimpleRtcStore>((set, get) => ({
  localStream: null,
  remoteStream: null,
  isInitialized: false,

  initLocalMedia: async (mode) => {
    if (mode === "video") {
      await usePermissionStore.getState().requestCamera();
      await usePermissionStore.getState().requestMicrophone();
    } else {
      await usePermissionStore.getState().requestMicrophone();
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video",
    });

    set({
      localStream: stream,
      isInitialized: true,
    });
  },

  cleanup: () => {
    const local = get().localStream;
    const remote = get().remoteStream;

    local?.getTracks().forEach((t) => t.stop());
    remote?.getTracks().forEach((t) => t.stop());

    set({
      localStream: null,
      remoteStream: null,
      isInitialized: false,
    });
  },
}));
