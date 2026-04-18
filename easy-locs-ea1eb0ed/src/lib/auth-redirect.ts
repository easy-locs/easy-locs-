import type { User } from "@supabase/supabase-js";
import { db as supabase } from "@/services/db";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const SUPER_ADMIN_HOME = "/admin/super-dashboard";
export const DEFAULT_HOME = "/dashboard";

const ROLE_CHECK_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out (${ms}ms)`)), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export const getPostLoginRoute = async (userId: string, _attempt = 0): Promise<string> => {
  if (!userId) return DEFAULT_HOME;
  try {
    const { data, error } = await withTimeout(
      supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
      ROLE_CHECK_TIMEOUT_MS,
      "has_role(super_admin)",
    );
    if (!error && data === true) return SUPER_ADMIN_HOME;
  } catch (err) {
    // Never block login on role lookup — fall back to the default home.
    console.warn("[auth-redirect] super_admin role check failed (using default home):", err);
  }
  return DEFAULT_HOME;
};

export const waitForAuthenticatedUser = async (
  attempts = 6,
  delayMs = 200,
): Promise<User | null> => {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) return user;
    } catch (err) {
      console.warn("[auth-redirect] waitForAuthenticatedUser getUser failed:", err);
    }

    if (i < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return null;
};
