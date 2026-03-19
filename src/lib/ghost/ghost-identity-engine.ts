/**
 * Ghost Identity Engine — Profile creation, alias management, device binding.
 * Separate identity layer from normal chat/wallet.
 */
import { supabase } from "@/integrations/supabase/client";
import { GhostTier } from "./ghost-policy";

const GHOST_PREFIX = "ghost";
const ALIAS_PREFIX = "phantom";

function randomHex(bytes: number): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}

function generateGhostId(): string {
  return `${GHOST_PREFIX}_${randomHex(8)}`;
}

function generateGhostAlias(): string {
  return `${ALIAS_PREFIX}_${randomHex(4)}`;
}

export async function createGhostProfile(userId: string, tier: GhostTier = "v2") {
  const ghostId = generateGhostId();
  const alias = generateGhostAlias();

  const { data, error } = await supabase
    .from("ghost_profiles")
    .insert({
      user_id: userId,
      ghost_id: ghostId,
      current_alias: alias,
      alias_version: 1,
      tier,
      is_enabled: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  console.log("[ghost] profile_created", { ghostId, tier });
  return data;
}

export async function getGhostProfile(userId: string) {
  const { data, error } = await supabase
    .from("ghost_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_enabled", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getOrCreateGhostProfile(userId: string, tier: GhostTier = "v2") {
  const existing = await getGhostProfile(userId);
  if (existing) return existing;
  return createGhostProfile(userId, tier);
}

export async function rotateGhostAlias(ghostProfileId: string) {
  const newAlias = generateGhostAlias();

  const { data: profile } = await supabase
    .from("ghost_profiles")
    .select("alias_version")
    .eq("id", ghostProfileId)
    .single();

  const newVersion = (profile?.alias_version ?? 0) + 1;

  const { data, error } = await supabase
    .from("ghost_profiles")
    .update({
      current_alias: newAlias,
      alias_version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ghostProfileId)
    .select("*")
    .single();

  if (error) throw error;
  console.log("[ghost] alias_rotated", { ghostProfileId, newAlias, version: newVersion });
  return data;
}

export async function upgradeToV3(ghostProfileId: string) {
  const { data, error } = await supabase
    .from("ghost_profiles")
    .update({ tier: "v3", updated_at: new Date().toISOString() })
    .eq("id", ghostProfileId)
    .select("*")
    .single();

  if (error) throw error;
  console.log("[ghost] upgraded_to_v3", { ghostProfileId });
  return data;
}

export { generateGhostAlias, generateGhostId, randomHex };
