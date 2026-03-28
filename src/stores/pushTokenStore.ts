import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { getOrbitIdentity } from "@/hooks/useOrbitIdentity";

type PushTokenRow = {
  id: string;
  user_id: string;
  orbit_id: string | null;
  token: string;
  platform: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type PushTokenStore = {
  items: PushTokenRow[];
  loading: boolean;
  hydrate: () => Promise<void>;
  saveToken: (token: string, platform?: string) => Promise<void>;
  deactivateToken: (token: string) => Promise<void>;
};

export const usePushTokenStore = create<PushTokenStore>((set) => ({
  items: [],
  loading: false,

  hydrate: async () => {
    const user = useV2AuthStore.getState().user;
    if (!user) return;

    set({ loading: true });

    const { data, error } = await supabase
      .from("push_tokens")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to hydrate push tokens:", error);
      set({ loading: false });
      return;
    }

    set({ items: (data ?? []) as PushTokenRow[], loading: false });
  },

  saveToken: async (token, platform) => {
    const user = useV2AuthStore.getState().user;
    const orbit = getOrbitIdentity();
    if (!user) return;

    const row = {
      id: `push_${Math.random().toString(36).slice(2, 11)}`,
      user_id: user.id,
      orbit_id: orbit?.orbitId ?? null,
      token,
      platform: platform ?? null,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("push_tokens")
      .upsert(row, { onConflict: "token" });

    if (error) {
      console.error("Failed to save push token:", error);
      return;
    }

    await usePushTokenStore.getState().hydrate();
  },

  deactivateToken: async (token) => {
    const { error } = await supabase
      .from("push_tokens")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("token", token);

    if (error) {
      console.error("Failed to deactivate push token:", error);
      return;
    }

    await usePushTokenStore.getState().hydrate();
  },
}));
