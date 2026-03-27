import { supabase } from "@/integrations/supabase/client";

export async function listOrbitContacts(ownerUserId: string) {
  const { data, error } = await (supabase as any)
    .from("orbit_contacts_v2")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("is_favorite", { ascending: false })
    .order("display_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function upsertOrbitContact(input: {
  ownerUserId: string;
  peerUserId?: string | null;
  peerOrbitId?: string | null;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  source?: string;
  metadata?: Record<string, unknown>;
}) {
  const payload = {
    owner_user_id: input.ownerUserId,
    peer_user_id: input.peerUserId ?? null,
    peer_orbit_id: input.peerOrbitId ?? null,
    display_name: input.displayName ?? null,
    email: input.email?.toLowerCase() ?? null,
    phone: input.phone ?? null,
    avatar_url: input.avatarUrl ?? null,
    source: input.source ?? "manual",
    metadata: input.metadata ?? {},
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase as any)
    .from("orbit_contacts_v2")
    .upsert(payload);

  if (error) throw error;
}

/** @deprecated Use upsertOrbitContact instead */
export const addOrbitContact = upsertOrbitContact;

export async function toggleFavoriteContact(contactId: string, nextValue: boolean) {
  const { error } = await (supabase as any)
    .from("orbit_contacts_v2")
    .update({
      is_favorite: nextValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  if (error) throw error;
}

export async function toggleBlockedContact(contactId: string, nextValue: boolean) {
  const { error } = await (supabase as any)
    .from("orbit_contacts_v2")
    .update({
      is_blocked: nextValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  if (error) throw error;
}

/** @deprecated Use toggleBlockedContact instead */
export const blockContact = toggleBlockedContact;

export async function deleteOrbitContact(contactId: string) {
  const { error } = await (supabase as any)
    .from("orbit_contacts_v2")
    .delete()
    .eq("id", contactId);

  if (error) throw error;
}
