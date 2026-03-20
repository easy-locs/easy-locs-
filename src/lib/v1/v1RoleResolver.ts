import { supabase } from "@/integrations/supabase/client";
import type { AppActorRole } from "@/lib/v1/v1CoreTypes";

export type ResolvedV1Actor = {
  role: AppActorRole;
  merchantId: string | null;
  driverUserId: string | null;
  isAdmin: boolean;
};

export async function resolveV1Actor(userId: string | null | undefined): Promise<ResolvedV1Actor> {
  if (!userId) {
    return { role: "guest", merchantId: null, driverUserId: null, isAdmin: false };
  }

  let merchantId: string | null = null;
  let driverUserId: string | null = null;
  let isAdmin = false;

  try {
    const [{ data: merchant }, { data: driver }, { data: profile }] = await Promise.all([
      (supabase as any)
        .from("seed_merchants")
        .select("id, owner_user_id")
        .eq("owner_user_id", userId)
        .limit(1)
        .maybeSingle(),
      (supabase as any)
        .from("driver_profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle(),
      (supabase as any)
        .from("profiles")
        .select("role, is_admin")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    merchantId = merchant?.id ?? null;
    driverUserId = driver?.user_id ?? null;
    isAdmin = !!profile?.is_admin || profile?.role === "admin";
  } catch {
    // swallow and fall back safely
  }

  if (isAdmin) return { role: "admin", merchantId, driverUserId, isAdmin: true };
  if (merchantId) return { role: "merchant", merchantId, driverUserId, isAdmin: false };
  if (driverUserId) return { role: "driver", merchantId: null, driverUserId, isAdmin: false };
  return { role: "customer", merchantId: null, driverUserId: null, isAdmin: false };
}
