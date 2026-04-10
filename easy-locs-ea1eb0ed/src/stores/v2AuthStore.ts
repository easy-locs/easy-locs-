import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

/**
 * Global flag: when AuthContext (v1) is active, v2AuthStore piggybacks
 * off its session instead of registering a second onAuthStateChange listener.
 * This prevents duplicate Web Locks contention.
 */
let _v1AuthActive = false;
export function markV1AuthActive() { _v1AuthActive = true; }

type V2AuthStore = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;

  init: () => Promise<void>;
  syncFromV1: (session: Session | null) => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useV2AuthStore = create<V2AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  init: async () => {
    if (get().initialized) return;

    // If AuthContext (v1) is already managing auth, don't register a second listener.
    // V2 will be synced via syncFromV1() called from AuthContext.
    // Do not call getSession() here either — it can contend with the primary auth flow.
    if (_v1AuthActive) {
      return;
    }

    // Standalone V2 mode — register listener (only when AuthContext is NOT present)
    // onAuthStateChange fires INITIAL_SESSION on setup — no separate getSession() needed.
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        loading: false,
        initialized: true,
      });
    });
  },

  /** Called by AuthContext to sync session without a second onAuthStateChange */
  syncFromV1: (session) => {
    set({
      session,
      user: session?.user ?? null,
      loading: false,
      initialized: true,
    });
  },

  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
