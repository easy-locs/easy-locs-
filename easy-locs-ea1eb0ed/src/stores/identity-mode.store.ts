import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IdentityMode = "personal" | "business";

interface IdentityModeState {
  mode: IdentityMode;
  orgId: string | null;
  setMode: (mode: IdentityMode) => void;
  setOrgId: (orgId: string | null) => void;
  toggleMode: () => void;
}

export const useIdentityModeStore = create<IdentityModeState>()(
  persist(
    (set, get) => ({
      mode: "personal",
      orgId: null,
      setMode: (mode) => set({ mode }),
      setOrgId: (orgId) => set({ orgId }),
      toggleMode: () =>
        set({ mode: get().mode === "personal" ? "business" : "personal" }),
    }),
    {
      name: "easylocs_identity_mode",
      version: 1,
    },
  ),
);
