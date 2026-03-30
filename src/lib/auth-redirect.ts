import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getPostLoginRoute = async (userId: string, attempt = 0): Promise<string> => {
  try {
    const [{ data: tenantLink }, { data: orgLink }, { data: profile }] = await Promise.all([
      supabase.from("tenants").select("id").eq("tenant_user_id", userId).limit(1).maybeSingle(),
      supabase.from("org_members").select("id").eq("user_id", userId).limit(1).maybeSingle(),
      supabase.from("profiles").select("onboarding_completed").eq("id", userId).maybeSingle(),
    ]);

    const hasTenant = !!tenantLink;
    const hasOrg = !!orgLink;
    const onboardingDone = profile?.onboarding_completed ?? false;

    if (!hasOrg && !hasTenant && !onboardingDone) return "/onboarding";
    if (hasTenant && hasOrg) return "/dashboard";
    if (hasTenant && !hasOrg) return "/tenant";
    if (hasOrg) return "/dashboard";
    return "/client";
  } catch (err) {
    console.warn(`[auth-redirect] getPostLoginRoute attempt ${attempt} failed:`, err);
    // Retry once after 500ms backoff
    if (attempt < 1) {
      await sleep(500);
      return getPostLoginRoute(userId, attempt + 1);
    }
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
