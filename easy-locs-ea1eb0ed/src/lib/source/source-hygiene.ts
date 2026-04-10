/**
 * Source Hygiene — Rules, deduplication, visibility matrix, and claim flow.
 */
import { db } from "@/services/db";

// ── Source types ──
export type SourceType = "onboarding" | "google" | "aggregator" | "import_ai" | "manual" | "internal_seed";

export interface SourceRules {
  defaultConfidence: number;
  autoPublish: boolean;
  requiresClaim: boolean;
  allowedCapsBefore: string[];
  // Visibility matrix
  canBeLive: boolean;
  canBeSearchable: boolean;
  canBeOrderable: boolean;
  canBeMapVisible: boolean;
  maxReadinessWithoutClaim: "draft" | "needs_review" | "ready";
  label: string;
}

export const SOURCE_RULES: Record<SourceType, SourceRules> = {
  onboarding: {
    defaultConfidence: 100, autoPublish: false, requiresClaim: false,
    allowedCapsBefore: ["cap_wallet", "cap_qr", "cap_chat", "cap_call", "cap_booking", "cap_delivery", "cap_subscription"],
    canBeLive: true, canBeSearchable: true, canBeOrderable: true, canBeMapVisible: true,
    maxReadinessWithoutClaim: "ready",
    label: "Owner Onboarded",
  },
  manual: {
    defaultConfidence: 100, autoPublish: false, requiresClaim: false,
    allowedCapsBefore: ["cap_wallet", "cap_qr", "cap_chat", "cap_call", "cap_booking", "cap_delivery", "cap_subscription"],
    canBeLive: true, canBeSearchable: true, canBeOrderable: true, canBeMapVisible: true,
    maxReadinessWithoutClaim: "ready",
    label: "Manual Entry",
  },
  internal_seed: {
    defaultConfidence: 70, autoPublish: false, requiresClaim: false,
    allowedCapsBefore: ["cap_delivery", "cap_qr"],
    canBeLive: true, canBeSearchable: true, canBeOrderable: true, canBeMapVisible: true,
    maxReadinessWithoutClaim: "ready",
    label: "Internal Seed",
  },
  import_ai: {
    defaultConfidence: 60, autoPublish: false, requiresClaim: false,
    allowedCapsBefore: ["cap_delivery"],
    canBeLive: false, canBeSearchable: true, canBeOrderable: false, canBeMapVisible: true,
    maxReadinessWithoutClaim: "needs_review",
    label: "AI Import",
  },
  aggregator: {
    defaultConfidence: 50, autoPublish: false, requiresClaim: true,
    allowedCapsBefore: [],
    canBeLive: false, canBeSearchable: true, canBeOrderable: false, canBeMapVisible: true,
    maxReadinessWithoutClaim: "draft",
    label: "Aggregator Import",
  },
  google: {
    defaultConfidence: 40, autoPublish: false, requiresClaim: true,
    allowedCapsBefore: [],
    canBeLive: false, canBeSearchable: false, canBeOrderable: false, canBeMapVisible: true,
    maxReadinessWithoutClaim: "draft",
    label: "Google Import",
  },
};

export function getSourceRules(type: SourceType | string): SourceRules {
  return SOURCE_RULES[type as SourceType] ?? SOURCE_RULES.manual;
}

/**
 * Apply source-based visibility caps to audit gate flags.
 * Call after audit to enforce source restrictions.
 */
export function applySourceVisibility(
  sourceType: string | null | undefined,
  isClaimed: boolean | null | undefined,
  auditFlags: {
    isPublishable: boolean;
    isSearchable: boolean;
    isOrderable: boolean;
    isMapVisible: boolean;
    isBookable: boolean;
    status: string;
  }
) {
  const rules = getSourceRules(sourceType || "manual");
  const claimed = !!isClaimed;

  return {
    isPublishable: auditFlags.isPublishable && (claimed || !rules.requiresClaim) && rules.canBeLive,
    isSearchable: auditFlags.isSearchable && rules.canBeSearchable,
    isOrderable: auditFlags.isOrderable && (claimed || !rules.requiresClaim) && rules.canBeOrderable,
    isMapVisible: auditFlags.isMapVisible && rules.canBeMapVisible,
    isBookable: auditFlags.isBookable && (claimed || !rules.requiresClaim),
    // Cap readiness status based on source
    effectiveStatus: !claimed && rules.requiresClaim
      ? clampStatus(auditFlags.status, rules.maxReadinessWithoutClaim)
      : auditFlags.status,
  };
}

function clampStatus(status: string, max: "draft" | "needs_review" | "ready"): string {
  const ORDER = ["draft", "needs_review", "ready", "live"];
  const statusIdx = ORDER.indexOf(status);
  const maxIdx = ORDER.indexOf(max);
  if (statusIdx <= maxIdx) return status;
  return max;
}

// ── Cross-source deduplication ──
export interface DedupeMatch {
  shopId: string;
  shopName: string;
  matchType: "name" | "phone" | "address" | "external_id";
  confidence: number;
}

export async function findDuplicateShops(params: {
  name: string;
  phone?: string | null;
  address?: string | null;
  sourceExternalId?: string | null;
  excludeId?: string;
}): Promise<DedupeMatch[]> {
  const matches: DedupeMatch[] = [];

  if (params.sourceExternalId) {
    const { data } = await db
      .from("storefront_pages")
      .select("id, name")
      .eq("source_external_id", params.sourceExternalId)
      .limit(5);
    if (data?.length) {
      data.forEach((s: any) => {
        if (s.id !== params.excludeId) {
          matches.push({ shopId: s.id, shopName: s.name, matchType: "external_id", confidence: 99 });
        }
      });
    }
  }

  if (params.name?.trim()) {
    const { data } = await db
      .from("storefront_pages")
      .select("id, name")
      .ilike("name", `%${params.name.trim()}%`)
      .limit(10);
    if (data?.length) {
      data.forEach((s: any) => {
        if (s.id !== params.excludeId && !matches.some(m => m.shopId === s.id)) {
          matches.push({ shopId: s.id, shopName: s.name, matchType: "name", confidence: 70 });
        }
      });
    }
  }

  if (params.phone?.trim()) {
    const cleanPhone = params.phone.replace(/\D/g, "");
    if (cleanPhone.length >= 7) {
      const { data } = await db
        .from("storefront_pages")
        .select("id, name")
        .ilike("contact_phone", `%${cleanPhone.slice(-7)}%`)
        .limit(5);
      if (data?.length) {
        data.forEach((s: any) => {
          if (s.id !== params.excludeId && !matches.some(m => m.shopId === s.id)) {
            matches.push({ shopId: s.id, shopName: s.name, matchType: "phone", confidence: 85 });
          }
        });
      }
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

// ── Claim flow ──
export async function claimShop(params: {
  shopId: string;
  userId: string;
  orgId: string;
  verificationMethod: "phone" | "email" | "manual";
}): Promise<{ success: boolean; error?: string }> {
  const { data: shop, error: fetchErr } = await db
    .from("storefront_pages")
    .select("id, name, is_claimed, claimed_by_owner, user_id, source_type")
    .eq("id", params.shopId)
    .single();

  if (fetchErr || !shop) return { success: false, error: "Shop not found" };
  if (shop.is_claimed && shop.claimed_by_owner) return { success: false, error: "Shop already claimed" };

  const { error: updateErr } = await db
    .from("storefront_pages")
    .update({
      user_id: params.userId,
      org_id: params.orgId,
      is_claimed: true,
      claimed_by_owner: true,
      source_confidence: 100,
      data_freshness_at: new Date().toISOString(),
    } as any)
    .eq("id", params.shopId);

  if (updateErr) return { success: false, error: updateErr.message };
  return { success: true };
}

// ── Source stats ──
export async function getSourceStats(): Promise<Array<{ source_type: string; count: number; avg_confidence: number; claimed: number; unclaimed: number }>> {
  const { data } = await db
    .from("storefront_pages")
    .select("source_type, source_confidence, is_claimed");

  if (!data?.length) return [];

  const groups: Record<string, { count: number; totalConf: number; claimed: number; unclaimed: number }> = {};
  for (const row of data) {
    const st = row.source_type || "unknown";
    if (!groups[st]) groups[st] = { count: 0, totalConf: 0, claimed: 0, unclaimed: 0 };
    groups[st].count++;
    groups[st].totalConf += row.source_confidence || 0;
    if (row.is_claimed) groups[st].claimed++; else groups[st].unclaimed++;
  }

  return Object.entries(groups).map(([source_type, g]) => ({
    source_type,
    count: g.count,
    avg_confidence: g.count ? Math.round(g.totalConf / g.count) : 0,
    claimed: g.claimed,
    unclaimed: g.unclaimed,
  }));
}
