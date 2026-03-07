import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getPostLoginRoute = async (userId: string): Promise<string> => {
  try {
    const [{ data: tenantLink }, { data: orgLink }] = await Promise.all([
      supabase.from("tenants").select("id").eq("tenant_user_id", userId).limit(1).maybeSingle(),
      supabase.from("org_members").select("id").eq("user_id", userId).limit(1).maybeSingle(),
    ]);

    const hasTenant = !!tenantLink;
    const hasOrg = !!orgLink;

    if (hasTenant && hasOrg) return "/dashboard";
    if (hasTenant && !hasOrg) return "/tenant";
    return "/dashboard";
  } catch (err) {
    console.warn("[auth-redirect] getPostLoginRoute failed:", err);
    return "/dashboard";
  }
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
