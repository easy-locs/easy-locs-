import { db } from "@/services/db";
import { typedQueries } from "@/lib/db/typed-queries";

export async function resolveUserByEmail(email: string): Promise<{ userId: string; orbitId: string | null; avatarUrl: string | null } | null> {
  if (!email) return null;
  const { data: profileData } = await typedQueries.profiles.selectByEmail(email.toLowerCase());
  if (profileData?.id) {
    const { data: orbit } = await typedQueries.orbitProfiles.selectByUserId(profileData.id);
    return { userId: profileData.id, orbitId: orbit?.orbit_id ?? null, avatarUrl: orbit?.avatar_url ?? null };
  }
  return null;
}

export async function resolveUserByPhone(phone: string): Promise<{ userId: string; orbitId: string | null; avatarUrl: string | null } | null> {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  const { data: profileRow } = await db("profiles")
    .select("id")
    .eq("phone", cleaned)
    .maybeSingle() as unknown as { data: { id: string } | null };
  if (!profileRow?.id) return null;
  const { data: orbitRow } = await db("orbit_profiles_v2")
    .select("id, orbit_id, avatar_url")
    .eq("id", profileRow.id)
    .maybeSingle() as unknown as { data: { id: string; orbit_id: string | null; avatar_url: string | null } | null };
  return { userId: profileRow.id, orbitId: orbitRow?.orbit_id ?? null, avatarUrl: orbitRow?.avatar_url ?? null };
}

export async function linkContactToUser(contactId: string, userId: string, orbitId: string | null, avatarUrl: string | null) {
  const patch: Record<string, unknown> = {
    peer_user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (orbitId) patch.peer_orbit_id = orbitId;
  if (avatarUrl) patch.avatar_url = avatarUrl;
  await db("orbit_contacts_v2").update(patch).eq("id", contactId);
}

export async function listOrbitContacts(ownerUserId: string) {
  const { data, error } = await db("orbit_contacts_v2")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("is_favorite", { ascending: false })
    .order("display_name", { ascending: true }) as unknown as { data: Record<string, unknown>[] | null; error: Error | null };

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
  let resolvedUserId = input.peerUserId ?? null;
  let resolvedOrbitId = input.peerOrbitId ?? null;
  let resolvedAvatar = input.avatarUrl ?? null;

  if (!resolvedUserId && input.email) {
    const found = await resolveUserByEmail(input.email);
    if (found) {
      resolvedUserId = found.userId;
      resolvedOrbitId = found.orbitId;
      if (found.avatarUrl) resolvedAvatar = found.avatarUrl;
    }
  }
  if (!resolvedUserId && input.phone) {
    const found = await resolveUserByPhone(input.phone);
    if (found) {
      resolvedUserId = found.userId;
      resolvedOrbitId = found.orbitId;
      if (found.avatarUrl) resolvedAvatar = found.avatarUrl;
    }
  }

  const payload = {
    owner_user_id: input.ownerUserId,
    display_name: input.displayName || null,
    email: input.email || null,
    phone: input.phone || null,
    avatar_url: resolvedAvatar,
    peer_user_id: resolvedUserId,
    peer_orbit_id: resolvedOrbitId,
    source: input.source || "manual",
    metadata: input.metadata || {},
    updated_at: new Date().toISOString(),
  };

  if (resolvedUserId) {
    const { data: existing } = await db("orbit_contacts_v2")
      .select("id")
      .eq("owner_user_id", input.ownerUserId)
      .eq("peer_user_id", resolvedUserId)
      .maybeSingle() as unknown as { data: { id: string } | null };

    if (existing) {
      await db("orbit_contacts_v2").update(payload).eq("id", existing.id);
      return existing.id;
    }
  }

  const { data, error } = await db("orbit_contacts_v2")
    .insert(payload)
    .select("id")
    .single() as unknown as { data: { id: string } | null; error: Error | null };

  if (error) throw error;
  return data?.id;
}

export async function updateOrbitContact(contactId: string, patch: Record<string, unknown>) {
  await db("orbit_contacts_v2")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", contactId);
}

export async function toggleFavoriteContact(contactId: string, isFavorite: boolean) {
  await db("orbit_contacts_v2")
    .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
    .eq("id", contactId);
}

export async function deleteOrbitContact(contactId: string) {
  await db("orbit_contacts_v2").delete().eq("id", contactId);
}

export async function toggleBlockedContact(contactId: string, isBlocked: boolean) {
  await db("orbit_contacts_v2")
    .update({ is_blocked: isBlocked, updated_at: new Date().toISOString() })
    .eq("id", contactId);
}
