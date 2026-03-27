import { supabase } from "@/integrations/supabase/client";

export async function listOrbitContacts(ownerUserId: string) {
  const { data, error } = await (supabase as any)
    .from("orbit_contacts_v2")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("is_favorite", { ascending: false })
    .order("display_name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addOrbitContact(input: {
  ownerUserId: string;
  peerUserId?: string | null;
  peerOrbitId?: string | null;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  source?: string;
}) {
  const { error } = await (supabase as any)
    .from("orbit_contacts_v2")
    .upsert({
      owner_user_id: input.ownerUserId,
      peer_user_id: input.peerUserId ?? null,
      peer_orbit_id: input.peerOrbitId ?? null,
      display_name: input.displayName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      avatar_url: input.avatarUrl ?? null,
      source: input.source ?? "manual",
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function toggleFavoriteContact(contactId: string, next: boolean) {
  const { error } = await (supabase as any)
    .from("orbit_contacts_v2")
    .update({ is_favorite: next, updated_at: new Date().toISOString() })
    .eq("id", contactId);
  if (error) throw error;
}

export async function blockContact(contactId: string, next: boolean) {
  const { error } = await (supabase as any)
    .from("orbit_contacts_v2")
    .update({ is_blocked: next, updated_at: new Date().toISOString() })
    .eq("id", contactId);
  if (error) throw error;
}
