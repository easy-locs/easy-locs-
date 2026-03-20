import { create } from "zustand";
import { platformBus } from "@/app/events/platform-bus";

type PanelName =
  | "chat"
  | "call"
  | "contact"
  | "wallet"
  | "booking"
  | "listing"
  | "none";

type CameraMode = "qr" | "call" | "proof" | "avatar" | null;

type UiShellStore = {
  leftPanel: PanelName;
  rightPanel: PanelName;
  activeOverlay: string | null;
  cameraMode: CameraMode;
  callFullscreen: boolean;
  mapFullscreen: boolean;

  setPanels: (payload: { leftPanel?: PanelName; rightPanel?: PanelName }) => void;
  setActiveOverlay: (overlay: string | null) => void;
  openCamera: (mode: Exclude<CameraMode, null>) => void;
  closeCamera: () => void;
  setCallFullscreen: (value: boolean) => void;
  setMapFullscreen: (value: boolean) => void;
};

export const useUiShellStore = create<UiShellStore>((set) => ({
  leftPanel: "none",
  rightPanel: "none",
  activeOverlay: null,
  cameraMode: null,
  callFullscreen: false,
  mapFullscreen: false,

  setPanels: ({ leftPanel, rightPanel }) => {
    set((state) => ({
      leftPanel: leftPanel ?? state.leftPanel,
      rightPanel: rightPanel ?? state.rightPanel,
    }));
    platformBus.emit({
      type: "ui.panel.changed",
      payload: { leftPanel: leftPanel ?? undefined, rightPanel: rightPanel ?? undefined },
    });
  },

  setActiveOverlay: (overlay) => set({ activeOverlay: overlay }),

  openCamera: (mode) => {
    set({ cameraMode: mode });
    platformBus.emit({ type: "camera.opened", payload: { mode } });
  },

  closeCamera: () => {
    set({ cameraMode: null });
    platformBus.emit({ type: "camera.closed", payload: {} });
  },

  setCallFullscreen: (value) => set({ callFullscreen: value }),
  setMapFullscreen: (value) => set({ mapFullscreen: value }),
}));
