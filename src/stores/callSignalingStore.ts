import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useV2AuthStore } from "@/stores/v2AuthStore";
import { useOrbitStore } from "@/stores/orbitStore";
import type { CallSessionV2 } from "@/lib/types/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type CallSignalingStore = {
  activeSession: CallSessionV2 | null;
  createCallSession: (calleeOrbitId: string, mode: "audio" | "video") => Promise<void>;
  updateSessionStatus: (status: CallSessionV2["status"]) => Promise<void>;
  sendSignal: (signalType: "offer" | "answer" | "ice" | "hangup", targetOrbitId: string, payload: Record<string, unknown>) => Promise<void>;
  clear: () => void;
};

export const useCallSignalingStore = create<CallSignalingStore>((set, get) => ({
  activeSession: null,

  createCallSession: async (calleeOrbitId, mode) => {
    const user = useV2AuthStore.getState().user;
    const orbit = useOrbitStore.getState().profile;
    if (!user || !orbit) return;

    const sessionPayload = {
      caller_user_id: user.id,
      caller_orbit_id: orbit.orbitId,
      callee_orbit_id: calleeOrbitId,
      mode,
      status: "ringing",
    };

    const { data, error } = await db
      .from("orbit_call_sessions_v2")
      .insert(sessionPayload)
      .select()
      .single();

    if (error) throw error;
    set({ activeSession: data as CallSessionV2 });
  },

  updateSessionStatus: async (status) => {
    const session = get().activeSession;
    if (!session) return;

    const { data, error } = await db
      .from("orbit_call_sessions_v2")
      .update({ status })
      .eq("id", session.id)
      .select()
      .single();

    if (error) throw error;
    set({ activeSession: data as CallSessionV2 });
  },

  sendSignal: async (signalType, targetOrbitId, payload) => {
    const user = useV2AuthStore.getState().user;
    const orbit = useOrbitStore.getState().profile;
    const session = get().activeSession;
    if (!user || !orbit || !session) return;

    const { error } = await db.from("orbit_call_signals_v2").insert({
      session_id: session.id,
      sender_user_id: user.id,
      sender_orbit_id: orbit.orbitId,
      target_orbit_id: targetOrbitId,
      signal_type: signalType,
      payload,
    });

    if (error) throw error;
  },

  clear: () => set({ activeSession: null }),
}));
