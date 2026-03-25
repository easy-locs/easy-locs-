/**
 * Staff Sync Engine — Verifies merchant staff assignments and permissions consistency.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runStaffSync(limit = 100) {
  // Check staff with invalid roles or missing user links
  const { data: staff } = await db
    .from("merchant_staff")
    .select("id, user_id, shop_id, role, status")
    .limit(limit);

  let valid = 0, issues = 0, fixed = 0;
  for (const s of staff ?? []) {
    if (!s.user_id || !s.shop_id) {
      issues++;
      continue;
    }
    if (!["owner", "manager", "cashier", "kitchen", "staff"].includes(s.role ?? "")) {
      await db.from("merchant_staff").update({ role: "staff" }).eq("id", s.id);
      fixed++;
      continue;
    }
    valid++;
  }

  return { total: staff?.length ?? 0, valid, issues, fixed };
}
