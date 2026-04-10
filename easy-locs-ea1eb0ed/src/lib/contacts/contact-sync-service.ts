import { db } from "@/services/db";
import { normalizePhone } from "@/lib/security/otp-hardened";
import { upsertOrbitContact } from "@/lib/orbit/orbit-contacts-service";
import { platformBus } from "@/lib/shared/platform-bus";

export interface PhoneContact {
  name: string;
  phone: string;
  email?: string;
}

export interface SyncResult {
  synced: number;
  matched: number;
  matchedContacts: MatchedContact[];
}

export interface MatchedContact {
  name: string;
  phone: string;
  userId: string;
  orbitId: string | null;
  avatarUrl: string | null;
  displayName: string | null;
}

export async function syncPhoneContacts(
  ownerUserId: string,
  contacts: PhoneContact[]
): Promise<SyncResult> {
  if (!contacts.length) return { synced: 0, matched: 0, matchedContacts: [] };

  const normalizedPhones = contacts.map((c) => ({
    ...c,
    normalizedPhone: normalizePhone(c.phone),
  }));

  const phoneList = normalizedPhones
    .map((c) => c.normalizedPhone)
    .filter(Boolean);

  let platformUsers: Map<string, { id: string; orbit_id: string | null; avatar_url: string | null; display_name: string | null }> = new Map();

  if (phoneList.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < phoneList.length; i += batchSize) {
      const batch = phoneList.slice(i, i + batchSize);
      const { data } = await db
        .from("orbit_profiles_v2")
        .select("id, phone, orbit_id, avatar_url, display_name")
        .in("phone", batch);

      if (data) {
        for (const user of data) {
          if (user.phone) {
            platformUsers.set(normalizePhone(user.phone), user as any);
          }
        }
      }
    }
  }

  const matchedContacts: MatchedContact[] = [];
  let synced = 0;

  for (const contact of normalizedPhones) {
    try {
      const platformUser = platformUsers.get(contact.normalizedPhone);

      await upsertOrbitContact({
        ownerUserId,
        peerUserId: platformUser?.id || null,
        peerOrbitId: platformUser?.orbit_id || null,
        displayName: contact.name,
        phone: contact.normalizedPhone,
        email: contact.email || null,
        avatarUrl: platformUser?.avatar_url || null,
        source: "phone_sync",
        metadata: {
          synced_at: new Date().toISOString(),
          original_name: contact.name,
        },
      });

      synced++;

      if (platformUser) {
        matchedContacts.push({
          name: contact.name,
          phone: contact.normalizedPhone,
          userId: platformUser.id,
          orbitId: platformUser.orbit_id,
          avatarUrl: platformUser.avatar_url,
          displayName: platformUser.display_name,
        });
      }
    } catch (err) {
      console.warn("[ContactSync] Failed to sync contact:", contact.name, err);
    }
  }

  platformBus.emit("contacts:synced" as any, {
    userId: ownerUserId,
    synced,
    matched: matchedContacts.length,
    timestamp: Date.now(),
  });

  return {
    synced,
    matched: matchedContacts.length,
    matchedContacts,
  };
}

export async function discoverPlatformContacts(
  ownerUserId: string
): Promise<MatchedContact[]> {
  const { data: existingContacts } = await db
    .from("orbit_contacts_v2")
    .select("phone, display_name")
    .eq("owner_user_id", ownerUserId)
    .not("phone", "is", null);

  if (!existingContacts?.length) return [];

  const phones = existingContacts
    .map((c: any) => normalizePhone(c.phone || ""))
    .filter(Boolean);

  if (!phones.length) return [];

  const { data: users } = await db
    .from("orbit_profiles_v2")
    .select("id, phone, orbit_id, avatar_url, display_name")
    .in("phone", phones)
    .neq("id", ownerUserId);

  if (!users?.length) return [];

  const matched: MatchedContact[] = [];
  for (const user of users) {
    const contact = existingContacts.find(
      (c: any) => normalizePhone(c.phone || "") === normalizePhone(user.phone || "")
    );
    matched.push({
      name: contact?.display_name || user.display_name || "Contact",
      phone: user.phone || "",
      userId: user.id,
      orbitId: user.orbit_id,
      avatarUrl: user.avatar_url,
      displayName: user.display_name,
    });
  }

  return matched;
}

export async function requestContactsPermission(): Promise<boolean> {
  if ("contacts" in navigator && "ContactsManager" in window) {
    try {
      const props = ["name", "tel"];
      const contacts = await (navigator as any).contacts.select(props, { multiple: true });
      return contacts && contacts.length > 0;
    } catch {
      return false;
    }
  }
  return false;
}

export async function readNativeContacts(): Promise<PhoneContact[]> {
  if (!("contacts" in navigator && "ContactsManager" in window)) {
    return [];
  }

  try {
    const props = ["name", "tel", "email"];
    const contacts = await (navigator as any).contacts.select(props, { multiple: true });

    return (contacts || [])
      .filter((c: any) => c.tel && c.tel.length > 0)
      .map((c: any) => ({
        name: c.name?.[0] || "Unknown",
        phone: c.tel[0],
        email: c.email?.[0] || undefined,
      }));
  } catch {
    return [];
  }
}
