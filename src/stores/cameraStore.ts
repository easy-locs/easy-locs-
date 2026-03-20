import { create } from "zustand";
import { platformBus } from "@/app/events/platform-bus";

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
    const constraints: MediaStreamConstraints =
      mode === "call" ? { video: true, audio: true } : { video: true, audio: false };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

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
