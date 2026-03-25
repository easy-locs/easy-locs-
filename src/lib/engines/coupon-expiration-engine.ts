/**
 * Coupon Expiration Engine — Auto-expires coupons past their end date.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runCouponExpiration(limit = 100) {
  const now = new Date().toISOString();

  const { data: expired } = await db
    .from("coupons")
    .select("id, code, status, expires_at")
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lt("expires_at", now)
    .limit(limit);

  let deactivated = 0;
  for (const coupon of expired ?? []) {
    await db.from("coupons").update({ status: "expired" }).eq("id", coupon.id);
    deactivated++;
  }

  return { checked: expired?.length ?? 0, deactivated };
}
