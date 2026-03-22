import { create } from "zustand";
import { platformBus } from "@/app/events/platform-bus";
import { requestMediaStream } from "@/lib/device/permissions";

type CameraMode = "qr" | "call" | "proof" | "avatar";

type CameraStore = {
  stream: MediaStream | null;
  mode: CameraMode | null;
  isOpen: boolean;

  openCamera: (mode: CameraMode) => Promise<void>;
  closeCamera: () => void;
};

export const useCameraStore = create<CameraStore>((set, get) => ({
  stream: null,
  mode: null,
  isOpen: false,

  openCamera: async (mode) => {
    const useRear = mode === "qr" || mode === "proof";
    const videoConstraints: MediaTrackConstraints = useRear
      ? { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { facingMode: "user" };

    const stream = await requestMediaStream({
      camera: true,
      microphone: mode === "call",
      videoConstraints,
    });

    set({
      stream,
      mode,
      isOpen: true,
    });

    platformBus.emit({
      type: "camera.opened",
      payload: { mode },
    });
  },

  closeCamera: () => {
    const stream = get().stream;
    stream?.getTracks().forEach((track) => track.stop());

    set({
      stream: null,
      mode: null,
      isOpen: false,
    });

    platformBus.emit({
      type: "camera.closed",
      payload: {},
    });
  },
}));
