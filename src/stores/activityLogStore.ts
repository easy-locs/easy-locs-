import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { getOrbitIdentity } from "@/hooks/useOrbitIdentity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type ActivityRow = {
  id: string;
  user_id: string | null;
  orbit_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ActivityLogStore = {
  items: ActivityRow[];
  log: (input: {
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useActivityLogStore = create<ActivityLogStore>((set) => ({
  items: [],

  log: async (input) => {
    const user = useV2AuthStore.getState().user;
    const orbit = getOrbitIdentity();

    const row = {
      id: `act_${Math.random().toString(36).slice(2, 11)}`,
      user_id: user?.id ?? null,
      orbit_id: orbit?.orbitId ?? null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("activity_logs")
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error("Failed to log activity:", error);
      return;
    }

    set((state) => ({
      items: [data as ActivityRow, ...state.items],
    }));
  },

  hydrate: async () => {
    const user = useV2AuthStore.getState().user;
    if (!user) return;

    const { data, error } = await db
      .from("activity_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to hydrate activity logs:", error);
      return;
    }

    set({ items: (data ?? []) as ActivityRow[] });
  },
}));
