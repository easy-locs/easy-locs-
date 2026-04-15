import { db } from "@/services/db";
import { supabase } from "@/integrations/supabase/client";
import type { KYCLevel } from "@/lib/systems/compliance-engine";

export interface KycGateCheckResult {
  allowed: boolean;
  currentLevel: KYCLevel;
  requiredLevel: KYCLevel;
  reason?: string;
}

const KYC_LEVEL_ORDER: KYCLevel[] = ["none", "basic", "standard", "enhanced", "full"];

function levelIndex(level: KYCLevel): number {
  return KYC_LEVEL_ORDER.indexOf(level);
}

const ACTION_REQUIRED_LEVELS: Record<string, KYCLevel> = {
  publish_listing: "basic",
  assign_driver: "basic",
  accept_ride: "basic",
  wallet_transfer_high: "standard",
  wallet_withdraw: "enhanced",
  boost_advertising: "standard",
};

async function getCurrentUserKycLevel(): Promise<KYCLevel> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) return "none";

  const { data: provider } = await db
    .from("providers")
    .select("kyc_level")
    .eq("user_id", userId)
    .maybeSingle();

  return (provider?.kyc_level as KYCLevel) || "none";
}

export async function checkKycLevelForAction(action: string, overrideLevel?: KYCLevel): Promise<KycGateCheckResult> {
  const requiredLevel = ACTION_REQUIRED_LEVELS[action] || "basic";
  const currentLevel = overrideLevel ?? await getCurrentUserKycLevel();

  const currentIdx = levelIndex(currentLevel);
  const requiredIdx = levelIndex(requiredLevel);

  if (currentIdx >= requiredIdx) {
    return { allowed: true, currentLevel, requiredLevel };
  }

  return {
    allowed: false,
    currentLevel,
    requiredLevel,
    reason: `KYC level "${requiredLevel}" required for ${action}. Current level: "${currentLevel}".`,
  };
}

export class KycLevelError extends Error {
  readonly currentLevel: KYCLevel;
  readonly requiredLevel: KYCLevel;
  constructor(currentLevel: KYCLevel, requiredLevel: KYCLevel) {
    super(`KYC level "${requiredLevel}" required. Current level: "${currentLevel}". Complete verification at /pro/compliance.`);
    this.name = "KycLevelError";
    this.currentLevel = currentLevel;
    this.requiredLevel = requiredLevel;
  }
}

export async function requireKycLevel(userId: string, requiredLevel: KYCLevel): Promise<void> {
  const result = await checkKycLevelForUser(userId, requiredLevel);
  if (!result.allowed) {
    throw new KycLevelError(result.currentLevel, result.requiredLevel);
  }
}

export async function checkKycLevelForUser(userId: string, requiredLevel: KYCLevel): Promise<KycGateCheckResult> {
  const { data: provider } = await db
    .from("providers")
    .select("kyc_level")
    .eq("user_id", userId)
    .maybeSingle();

  const currentLevel = (provider?.kyc_level as KYCLevel) || "none";
  const currentIdx = levelIndex(currentLevel);
  const requiredIdx = levelIndex(requiredLevel);

  if (currentIdx >= requiredIdx) {
    return { allowed: true, currentLevel, requiredLevel };
  }

  return {
    allowed: false,
    currentLevel,
    requiredLevel,
    reason: `KYC level "${requiredLevel}" required. Current level: "${currentLevel}".`,
  };
}
