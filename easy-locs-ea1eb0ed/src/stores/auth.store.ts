/**
 * AUTH DEPENDENCY: auth.store.ts — Zustand auth store.
 * Contact points:
 *   - syncFromAuth() called by AuthContext after each session change
 *   - signUp/signIn/signOut: direct supabase.auth calls (used by non-React code)
 *   - Consumed by: non-React services, stores, hooks that need auth state outside React tree
 *
 * auth.store — Canonical auth store (unified).
 *
 * This is the single canonical auth store. It merges what was previously
 * split between AuthContext (v1) and v2AuthStore into a single zustand store.
 *
 * AuthContext remains the React context provider for component subscriptions.
 * This store provides the same state for non-React code (stores, services, hooks)
 * without a second onAuthStateChange listener — AuthContext calls syncFromAuth()
 * after each session change.
 *
 * No more: markV1AuthActive() / syncFromV1() / dual-listener pattern.
 */
import { create } from "zustand";
import { db as supabase } from "@/services/db";
import type { User, Session } from "@supabase/supabase-js";

type AuthStore = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;

  /** Called by AuthContext after each onAuthStateChange / getSession — no second listener. */
  syncFromAuth: (session: Session | null) => void;

  /**
   * @deprecated No-op. Auth initialization is handled exclusively by AuthContext.
   * Kept for backward compatibility with consumers that called init() on the old v2AuthStore.
   */
  init: () => Promise<void>;

  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  init: async () => {},

  syncFromAuth: (session) => {
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
