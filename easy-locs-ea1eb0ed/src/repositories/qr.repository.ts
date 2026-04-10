/**
 * qr.repository — QR code resolution data fetching.
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";

export async function fetchProfileAndContact(userId: string, currentUserId: string) {
  const [{ data: profile }, { data: existingContact }] = await Promise.all([
    db("profiles").select("name").eq("id", userId).maybeSingle(),
    db("contacts").select("id").eq("owner_id", currentUserId).eq("contact_user_id", userId).maybeSingle(),
  ]);
  return { profile, existingContact };
}

export async function fetchDirectThreads() {
  const { data } = await db("conversations_v2")
    .select("id, participants").eq("type", "direct")
    .order("updated_at", { ascending: false }).limit(100);
  return data || [];
}
