import { create } from "zustand";
import { platformBus } from "@/lib/shared/platform-bus";

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
    platformBus.emit("ui.panel.changed", { leftPanel: leftPanel ?? undefined, rightPanel: rightPanel ?? undefined }, "system");
  },

  setActiveOverlay: (overlay) => set({ activeOverlay: overlay }),

  openCamera: (mode) => {
    set({ cameraMode: mode });
    platformBus.emit("camera.opened", { mode }, "system");
  },

  closeCamera: () => {
    set({ cameraMode: null });
    platformBus.emit("camera.closed", {}, "system");
  },

  setCallFullscreen: (value) => set({ callFullscreen: value }),
  setMapFullscreen: (value) => set({ mapFullscreen: value }),
}));
