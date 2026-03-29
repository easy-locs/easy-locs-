/**
 * location.viewer — Canonical location viewer state for full-screen map viewing.
 * Isolated from thread rendering. Manages open/close, loading, view-once consume.
 */
import { create } from "zustand";

export interface LocationViewerState {
  open: boolean;
  lat: number | null;
  lng: number | null;
  label: string | null;
  mode: "static" | "live" | "place";
  messageId: string | null;
  isLive: boolean;

  openLocation: (params: {
    lat: number;
    lng: number;
    label?: string;
    mode?: "static" | "live" | "place";
    messageId?: string;
  }) => void;
  close: () => void;
}

export const useLocationViewer = create<LocationViewerState>((set) => ({
  open: false,
  lat: null,
  lng: null,
  label: null,
  mode: "static",
  messageId: null,
  isLive: false,

  openLocation: ({ lat, lng, label, mode, messageId }) =>
    set({
      open: true,
      lat,
      lng,
      label: label || null,
      mode: mode || "static",
      messageId: messageId || null,
      isLive: mode === "live",
    }),

  close: () =>
    set({
      open: false,
      lat: null,
      lng: null,
      label: null,
      mode: "static",
      messageId: null,
      isLive: false,
    }),
}));
