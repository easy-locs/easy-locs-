import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface CanonicalOrbitProfile {
  id: string;
  orbit_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
}

export interface CanonicalCallTarget {
  user_id: string;
  orbit_id: string;
  display_name: string | null;
  strategy: string;
}

type ResolveLevel = "rpc" | "direct" | "synthetic";

function syntheticOrbitId(userId: string): string {
  return `orbit_${userId.replace(/-/g, "").substring(0, 8)}`;
}

function syntheticProfile(userId: string): CanonicalOrbitProfile {
  return {
    id: userId,
    orbit_id: syntheticOrbitId(userId),
    display_name: null,
    email: null,
    avatar_url: null,
    phone: null,
  };
}

function toCanonical(row: any): CanonicalOrbitProfile {
  return {
    id: row.id ?? row.user_id ?? "",
    orbit_id: row.orbit_id ?? syntheticOrbitId(row.id ?? row.user_id ?? ""),
    display_name: row.display_name ?? row.name ?? row.full_name ?? ([row.first_name, row.last_name].filter(Boolean).join(" ") || null),
    email: row.email ?? null,
    avatar_url: row.avatar_url ?? null,
    phone: row.phone ?? null,
  };
}

function trace(op: string, level: ResolveLevel, detail?: Record<string, unknown>) {
  console.log(`[OrbitGateway][${op}] ${level}`, detail ?? {});
}

async function tryRpc<T>(name: string, params: Record<string, any>): Promise<{ data: T | null; ok: boolean }> {
  const { data, error } = await db.rpc(name, params);
  if (error) return { data: null, ok: false };
  return { data, ok: true };
}

export async function lookupOrbitProfile(userId: string): Promise<CanonicalOrbitProfile> {
  const { data: rpc, ok: rpcOk } = await tryRpc<any[]>("lookup_orbit_profile_by_user_id", { _user_id: userId });
  if (rpcOk && rpc?.[0]) {
    trace("lookupProfile", "rpc", { userId });
    return toCanonical(rpc[0]);
  }

  const { data: orbitRow } = await db
    .from("orbit_profiles_v2")
    .select("id, orbit_id, display_name, email, avatar_url, phone")
    .eq("id", userId)
    .maybeSingle();
  if (orbitRow) {
    trace("lookupProfile", "direct", { userId });
    return toCanonical(orbitRow);
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, name, phone")
    .eq("id", userId)
    .maybeSingle();
  if (profileRow) {
    trace("lookupProfile", "direct", { userId, source: "profiles" });
    return toCanonical(profileRow);
  }

  trace("lookupProfile", "synthetic", { userId });
  return syntheticProfile(userId);
}

export async function batchLookupProfiles(userIds: string[]): Promise<Map<string, CanonicalOrbitProfile>> {
  const result = new Map<string, CanonicalOrbitProfile>();
  if (userIds.length === 0) return result;
  const unique = [...new Set(userIds)];

  const { data: rpc, ok: rpcOk } = await tryRpc<any[]>("batch_lookup_orbit_profiles", { _user_ids: unique });
  if (rpcOk && rpc?.length) {
    trace("batchLookup", "rpc", { count: rpc.length });
    for (const row of rpc) {
      const p = toCanonical(row);
      result.set(p.id, p);
    }
    if (result.size === unique.length) return result;
  }

  const missing = unique.filter(id => !result.has(id));
  if (missing.length > 0) {
    const { data: orbitRows } = await db
      .from("orbit_profiles_v2")
      .select("id, orbit_id, display_name, email, avatar_url, phone")
      .in("id", missing);
    if (orbitRows?.length) {
      trace("batchLookup", "direct", { source: "orbit_profiles_v2", count: orbitRows.length });
      for (const row of orbitRows) {
        const p = toCanonical(row);
        result.set(p.id, p);
      }
    }
  }

  const stillMissing = unique.filter(id => !result.has(id));
  if (stillMissing.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, name, phone")
      .in("id", stillMissing);
    if (profileRows?.length) {
      trace("batchLookup", "direct", { source: "profiles", count: profileRows.length });
      for (const row of profileRows) {
        const p = toCanonical(row);
        if (!result.has(p.id)) result.set(p.id, p);
      }
    }
  }

  for (const id of unique) {
    if (!result.has(id)) {
      result.set(id, syntheticProfile(id));
    }
  }

  return result;
}

export async function resolveUserByOrbitId(orbitId: string): Promise<CanonicalOrbitProfile | null> {
  if (!orbitId) return null;

  const { data: rpc, ok: rpcOk } = await tryRpc<any[]>("resolve_user_by_orbit_id", { _orbit_id: orbitId });
  if (rpcOk && rpc?.[0]) {
    trace("resolveByOrbitId", "rpc", { orbitId });
    return toCanonical(rpc[0]);
  }

  const { data: orbitRow } = await db
    .from("orbit_profiles_v2")
    .select("id, orbit_id, display_name, email, avatar_url, phone")
    .eq("orbit_id", orbitId)
    .maybeSingle();
  if (orbitRow) {
    trace("resolveByOrbitId", "direct", { orbitId });
    return toCanonical(orbitRow);
  }

  trace("resolveByOrbitId", "synthetic", { orbitId, reason: "not_found" });
  return null;
}

export async function resolveCallTarget(rawTargetId: string, callerUserId: string): Promise<CanonicalCallTarget | null> {
  const normalized = rawTargetId?.trim();
  if (!normalized) return null;
  trace("callTarget", "rpc", { rawTargetId, callerUserId });

  const { data: rpc, ok: rpcOk } = await tryRpc<any[]>("resolve_call_target", {
    _target_id: normalized,
    _caller_id: callerUserId,
  });
  if (rpcOk && rpc?.[0]?.user_id && rpc[0].user_id !== callerUserId) {
    return { user_id: rpc[0].user_id, orbit_id: rpc[0].orbit_id ?? syntheticOrbitId(rpc[0].user_id), display_name: rpc[0].display_name ?? null, strategy: "rpc" };
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);

  if (isUuid) {
    const { data: profileRow } = await supabase
      .from("profiles").select("id").eq("id", normalized).maybeSingle();
    if (profileRow?.id && profileRow.id !== callerUserId) {
      const profile = await lookupOrbitProfile(profileRow.id);
      return { user_id: profileRow.id, orbit_id: profile.orbit_id, display_name: profile.display_name, strategy: "direct_profile" };
    }
  }

  if (normalized.startsWith("orbit_")) {
    const resolved = await resolveUserByOrbitId(normalized);
    if (resolved && resolved.id !== callerUserId) {
      return { user_id: resolved.id, orbit_id: resolved.orbit_id, display_name: resolved.display_name, strategy: "orbit_id" };
    }
  }

  if (isUuid) {
    const { data: ownerMembership } = await supabase
      .from("org_members").select("user_id, role").eq("org_id", normalized).eq("role", "owner").limit(1).maybeSingle();
    if (ownerMembership?.user_id && ownerMembership.user_id !== callerUserId) {
      const profile = await lookupOrbitProfile(ownerMembership.user_id);
      return { user_id: ownerMembership.user_id, orbit_id: profile.orbit_id, display_name: profile.display_name, strategy: "org_owner" };
    }

    const { data: org } = await supabase
      .from("orgs").select("owner_user_id").eq("id", normalized).maybeSingle();
    if (org?.owner_user_id && org.owner_user_id !== callerUserId) {
      const profile = await lookupOrbitProfile(org.owner_user_id);
      return { user_id: org.owner_user_id, orbit_id: profile.orbit_id, display_name: profile.display_name, strategy: "orgs_owner" };
    }

    const { data: otherMember } = await supabase
      .from("org_members").select("user_id").eq("org_id", normalized).neq("user_id", callerUserId).limit(1).maybeSingle();
    if (otherMember?.user_id) {
      const profile = await lookupOrbitProfile(otherMember.user_id);
      return { user_id: otherMember.user_id, orbit_id: profile.orbit_id, display_name: profile.display_name, strategy: "org_member" };
    }
  }

  if (isUuid && normalized !== callerUserId) {
    trace("callTarget", "synthetic", { reason: "rls_blocked_trusting_uuid", rawTargetId });
    return { user_id: normalized, orbit_id: syntheticOrbitId(normalized), display_name: null, strategy: "trusted_uuid" };
  }

  trace("callTarget", "synthetic", { reason: "all_strategies_exhausted", rawTargetId });
  return null;
}

export async function resolveOrbitId(userId: string, fallback?: string | null): Promise<string> {
  if (fallback) return fallback;
  let profile: CanonicalOrbitProfile;
  try {
    profile = await lookupOrbitProfile(userId);
  } catch {
    return syntheticOrbitId(userId);
  }
  return profile.orbit_id;
}
