/**
 * QR Session Engine — Cleans expired QR sessions, monitors active ones.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runQrSessionCleanup(limit = 100) {
  const now = new Date().toISOString();

  // Expire old pending sessions
  const { data: expired } = await db
    .from("qr_payment_sessions")
    .select("id, status, expires_at")
    .eq("status", "pending")
    .not("expires_at", "is", null)
    .lt("expires_at", now)
    .limit(limit);

  let cleaned = 0;
  for (const session of expired ?? []) {
    await db.from("qr_payment_sessions").update({ status: "expired" }).eq("id", session.id);
    cleaned++;
  }

  // Count active
  const { count: active } = await db
    .from("qr_payment_sessions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return { expired: cleaned, activeSessions: active ?? 0 };
}
