import { supabase } from "@/integrations/supabase/client";
import type { AppActorRole } from "@/lib/v1/v1CoreTypes";

export type V1SessionContext = {
  role: AppActorRole;
  userId: string | null;
  merchantId: string | null;
  merchantName: string | null;
  driverUserId: string | null;
  isAdmin: boolean;
};

export async function loadV1SessionContext(userId: string | null | undefined): Promise<V1SessionContext> {
  if (!userId) {
    return {
      role: "guest",
      userId: null,
      merchantId: null,
      merchantName: null,
      driverUserId: null,
      isAdmin: false,
    };
  }

  let merchantId: string | null = null;
  let merchantName: string | null = null;
  let driverUserId: string | null = null;
  let isAdmin = false;

  const [merchantRes, driverRes, profileRes] = await Promise.allSettled([
    (supabase as any)
      .from("seed_merchants")
      .select("id,name,owner_user_id")
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
      .select("role,is_admin")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (merchantRes.status === "fulfilled") {
    merchantId = merchantRes.value?.data?.id ?? null;
    merchantName = merchantRes.value?.data?.name ?? null;
  }

  if (driverRes.status === "fulfilled") {
    driverUserId = driverRes.value?.data?.user_id ?? null;
  }

  if (profileRes.status === "fulfilled") {
    isAdmin =
      !!profileRes.value?.data?.is_admin ||
      profileRes.value?.data?.role === "admin";
  }

  let role: AppActorRole = "customer";
  if (isAdmin) role = "admin";
  else if (merchantId) role = "merchant";
  else if (driverUserId) role = "driver";

  return {
    role,
    userId,
    merchantId,
    merchantName,
    driverUserId,
    isAdmin,
  };
}
