/**
 * FAMILY: YOU TAB — Canonical user profile & settings state.
 * Single source of truth for the You/Settings tab runtime.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OrbitSettingsState {
  // Chat preferences
  chatBackground: string; // "default" | preset name | custom URL
  enterToSend: boolean;
  // Media preferences
  autoDownloadMedia: boolean;
  mediaQuality: "auto" | "low" | "high";
  // Live location defaults
  defaultLiveLocationDuration: number; // minutes
  // Disappearing messages
  defaultDisappearingTimer: number | null; // seconds, null = off

  setChatBackground: (v: string) => void;
  setEnterToSend: (v: boolean) => void;
  setAutoDownloadMedia: (v: boolean) => void;
  setMediaQuality: (v: "auto" | "low" | "high") => void;
  setDefaultLiveLocationDuration: (v: number) => void;
  setDefaultDisappearingTimer: (v: number | null) => void;
}

export const useOrbitSettingsStore = create<OrbitSettingsState>()(
  persist(
    (set) => ({
      chatBackground: "default",
      enterToSend: true,
      autoDownloadMedia: true,
      mediaQuality: "auto",
      defaultLiveLocationDuration: 15,
      defaultDisappearingTimer: null,

      setChatBackground: (v) => set({ chatBackground: v }),
      setEnterToSend: (v) => set({ enterToSend: v }),
      setAutoDownloadMedia: (v) => set({ autoDownloadMedia: v }),
      setMediaQuality: (v) => set({ mediaQuality: v }),
      setDefaultLiveLocationDuration: (v) => set({ defaultLiveLocationDuration: v }),
      setDefaultDisappearingTimer: (v) => set({ defaultDisappearingTimer: v }),
    }),
    { name: "orbit-settings" },
  ),
);
