/**
 * qr.repository — QR code resolution data fetching.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchProfileAndContact(userId: string, currentUserId: string) {
  const [{ data: profile }, { data: existingContact }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", userId).maybeSingle(),
    supabase.from("contacts").select("id").eq("owner_id", currentUserId).eq("contact_user_id", userId).maybeSingle(),
  ]);
  return { profile, existingContact };
}

export async function fetchDirectThreads() {
  const { data } = await (supabase as any).from("conversations_v2")
    .select("id, participants").eq("type", "direct")
    .order("updated_at", { ascending: false }).limit(100);
  return data || [];
}
