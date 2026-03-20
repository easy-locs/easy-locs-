import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useOrbitStore } from "@/stores/orbitStore";

type SignalType = "offer" | "answer" | "candidate" | "hangup";

type CallSignalStore = {
  sendSignal: (sessionId: string, signalType: SignalType, payload: unknown) => Promise<void>;
};

export const useCallSignalStore = create<CallSignalStore>(() => ({
  sendSignal: async (sessionId, signalType, payload) => {
    const orbit = useOrbitStore.getState().profile;
    if (!orbit) throw new Error("Missing orbit profile");

    const { error } = await (supabase as any).from("call_signals").insert({
      id: `sig_${Math.random().toString(36).slice(2, 11)}`,
      session_id: sessionId,
      sender_orbit_id: orbit.orbitId,
      signal_type: signalType,
      payload: payload ?? null,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
  },
}));
