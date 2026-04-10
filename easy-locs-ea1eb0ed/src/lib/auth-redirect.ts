import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getPostLoginRoute = async (_userId: string, _attempt = 0): Promise<string> => {
  return "/dashboard";
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
