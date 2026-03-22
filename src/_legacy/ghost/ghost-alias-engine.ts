/**
 * Ghost Alias Engine — Creation, rotation, and invalidation of ghost aliases.
 */
import { rotateGhostAlias as dbRotateAlias, getGhostProfile } from "./ghost-identity-engine";
import { getGhostPolicy, GhostTier } from "./ghost-policy";

let lastRotationTime = 0;

export function createGhostAlias(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, "0")).join("");
  return `phantom_${hex}`;
}

export async function rotateAlias(ghostProfileId: string): Promise<string> {
  const result = await dbRotateAlias(ghostProfileId);
  lastRotationTime = Date.now();
  console.log("[ghost] alias_engine_rotated", { alias: result.current_alias });
  return result.current_alias;
}

export async function getActiveGhostAlias(userId: string): Promise<string | null> {
  const profile = await getGhostProfile(userId);
  return profile?.current_alias ?? null;
}

export function shouldAutoRotate(tier: GhostTier): boolean {
  const policy = getGhostPolicy(tier);
  if (lastRotationTime === 0) return false;
  return Date.now() - lastRotationTime > policy.aliasRotationIntervalMs;
}

export async function maybeRotateOnNewThread(ghostProfileId: string, tier: GhostTier): Promise<string | null> {
  const policy = getGhostPolicy(tier);
  if (!policy.aliasRotateOnNewThread) return null;
  return rotateAlias(ghostProfileId);
}

export function invalidateOldAliasLinks(): void {
  // In V3, old aliases are logically detached from display
  // Historical messages may show "[redacted]" instead
  console.log("[ghost] old_alias_links_invalidated");
}
