/**
 * call.privacy — Canonical call privacy/incoming visibility family.
 * Handles: hidden caller mode, notification masking, lock-screen policy.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IncomingCallVisibility = "full" | "name_only" | "hidden";
export type LockScreenPolicy = "show_full" | "show_notification_only" | "hide";

interface CallPrivacyState {
  incomingVisibility: IncomingCallVisibility;
  lockScreenPolicy: LockScreenPolicy;
  hideCallerPhoto: boolean;
  setIncomingVisibility: (v: IncomingCallVisibility) => void;
  setLockScreenPolicy: (p: LockScreenPolicy) => void;
  setHideCallerPhoto: (hide: boolean) => void;
}

export const useCallPrivacyStore = create<CallPrivacyState>()(
  persist(
    (set) => ({
      incomingVisibility: "full",
      lockScreenPolicy: "show_full",
      hideCallerPhoto: false,

      setIncomingVisibility: (v) => set({ incomingVisibility: v }),
      setLockScreenPolicy: (p) => set({ lockScreenPolicy: p }),
      setHideCallerPhoto: (hide) => set({ hideCallerPhoto: hide }),
    }),
    { name: "orbit-call-privacy" },
  ),
);

export const CallPrivacy = {
  /** Get display name for incoming call based on privacy settings */
  getCallerDisplayName(realName: string): string {
    const { incomingVisibility } = useCallPrivacyStore.getState();
    switch (incomingVisibility) {
      case "full": return realName;
      case "name_only": return realName;
      case "hidden": return "Unknown Caller";
    }
  },

  /** Check if caller photo should be shown */
  shouldShowCallerPhoto(): boolean {
    const { incomingVisibility, hideCallerPhoto } = useCallPrivacyStore.getState();
    if (incomingVisibility === "hidden") return false;
    return !hideCallerPhoto;
  },

  /** Get notification body text based on privacy */
  getNotificationBody(callerName: string, mode: "audio" | "video"): string {
    const { incomingVisibility } = useCallPrivacyStore.getState();
    const callType = mode === "video" ? "Video call" : "Voice call";
    switch (incomingVisibility) {
      case "full": return `${callType} from ${callerName}`;
      case "name_only": return `${callType} from ${callerName}`;
      case "hidden": return `Incoming ${callType.toLowerCase()}`;
    }
  },

  /** Check if lock screen should show call details */
  shouldShowOnLockScreen(): boolean {
    return useCallPrivacyStore.getState().lockScreenPolicy !== "hide";
  },
};
