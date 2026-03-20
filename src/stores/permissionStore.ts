import { create } from "zustand";
import type { PermissionStateValue } from "@/lib/types/domain";
import { platformBus } from "@/app/events/platform-bus";

type PermissionStore = {
  camera: PermissionStateValue;
  microphone: PermissionStateValue;
  geolocation: PermissionStateValue;
  contacts: PermissionStateValue;
  notifications: PermissionStateValue;

  setPermission: (
    key: "camera" | "microphone" | "geolocation" | "contacts" | "notifications",
    value: PermissionStateValue
  ) => void;

  checkCamera: () => Promise<PermissionStateValue>;
  checkMicrophone: () => Promise<PermissionStateValue>;
  checkGeolocation: () => Promise<PermissionStateValue>;
  checkGeolocationPermission: () => Promise<PermissionStateValue>;
  requestGeolocation: () => Promise<GeolocationPosition | null>;
  requestCamera: () => Promise<boolean>;
  requestMicrophone: () => Promise<boolean>;
};

export const usePermissionStore = create<PermissionStore>((set) => ({
  camera: "prompt",
  microphone: "prompt",
  geolocation: "prompt",
  contacts: "prompt",
  notifications: "prompt",

  setPermission: (key, value) => {
    set({ [key]: value } as Partial<PermissionStore>);
    if (key === "geolocation") {
      platformBus.emit({
        type: "geo.permission.changed",
        payload: { state: value },
      });
    }
  },

  checkCamera: async () => {
    try {
      if (!navigator.permissions?.query) return "prompt";
      const result = await navigator.permissions.query({ name: "camera" as PermissionName });
      const state = result.state as PermissionStateValue;
      set({ camera: state });
      return state;
    } catch {
      return "prompt";
    }
  },

  checkMicrophone: async () => {
    try {
      if (!navigator.permissions?.query) return "prompt";
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      const state = result.state as PermissionStateValue;
      set({ microphone: state });
      return state;
    } catch {
      return "prompt";
    }
  },

  checkGeolocation: async () => {
    try {
      if (!navigator.permissions?.query) return "prompt";
      const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      const state = result.state as PermissionStateValue;
      set({ geolocation: state });
      return state;
    } catch {
      return "prompt";
    }
  },

  checkGeolocationPermission: async () => {
    try {
      if (!("permissions" in navigator) || !navigator.permissions?.query) {
        return "prompt";
      }
      const result = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });
      const state = result.state as PermissionStateValue;
      set({ geolocation: state });
      platformBus.emit({
        type: "geo.permission.changed",
        payload: { state },
      });
      return state;
    } catch {
      return "prompt";
    }
  },

  requestGeolocation: async () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        set({ geolocation: "denied" });
        platformBus.emit({ type: "geo.permission.changed", payload: { state: "denied" } });
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          set({ geolocation: "granted" });
          platformBus.emit({ type: "geo.permission.changed", payload: { state: "granted" } });
          resolve(position);
        },
        () => {
          set({ geolocation: "denied" });
          platformBus.emit({ type: "geo.permission.changed", payload: { state: "denied" } });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  },

  requestCamera: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      set({ camera: "granted" });
      return true;
    } catch {
      set({ camera: "denied" });
      return false;
    }
  },

  requestMicrophone: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      set({ microphone: "granted" });
      return true;
    } catch {
      set({ microphone: "denied" });
      return false;
    }
  },
}));
