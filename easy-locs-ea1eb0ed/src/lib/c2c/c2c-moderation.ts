import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

const PROHIBITED_PATTERNS = [
  /\b(arme|armes|weapon|weapons|gun|guns|firearm|pistol|fusil|munition)\b/i,
  /\b(drogue|drogues|drug|drugs|cocaine|heroin|cannabis|marijuana|mdma)\b/i,
  /\b(contrefaçon|contrefait|fake|counterfeit|replica|replique)\b/i,
  /\b(volé|stolen|volée|volés|volées)\b/i,
  /\b(arnaque|scam|fraude|fraud|phishing)\b/i,
  /\b(organe|organ|kidney|rein|sang|blood)\b/i,
  /\b(escort|prostitution|sex\s?work)\b/i,
];

const SUSPICIOUS_PATTERNS = [
  /\b(whatsapp|telegram|signal)\b/i,
  /\b(\d{8,15})\b/,
  /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/,
  /\b(western\s*union|moneygram|bitcoin|crypto|btc|eth)\b/i,
  /\b(paiement?\s*avanc|pay\s*before|virement?\s*d'abord)\b/i,
];

export type ModerationVerdict = "approved" | "flagged" | "rejected";
export type TrustLevel = "new" | "basic" | "verified" | "trusted" | "super_seller";

export interface ModerationResult {
  verdict: ModerationVerdict;
  flags: string[];
  trustScore: number;
  autoRejectReason?: string;
}

export interface TrustBadge {
  level: TrustLevel;
  label: string;
  emoji: string;
  color: string;
}

const TRUST_BADGES: Record<TrustLevel, TrustBadge> = {
  new: { level: "new", label: "Nouveau", emoji: "🆕", color: "text-gray-500" },
  basic: { level: "basic", label: "Membre", emoji: "👤", color: "text-blue-500" },
  verified: { level: "verified", label: "Vérifié", emoji: "✅", color: "text-emerald-500" },
  trusted: { level: "trusted", label: "Vendeur de confiance", emoji: "⭐", color: "text-amber-500" },
  super_seller: { level: "super_seller", label: "Super vendeur", emoji: "💎", color: "text-purple-500" },
};

export function getTrustBadge(level: TrustLevel): TrustBadge {
  return TRUST_BADGES[level] || TRUST_BADGES.new;
}

export function computeTrustLevel(stats: {
  listingCount: number;
  soldCount: number;
  avgRating: number;
  reviewCount: number;
  memberSinceDays: number;
  isVerified: boolean;
  reportCount: number;
}): TrustLevel {
  if (stats.reportCount > 3) return "new";
  if (stats.isVerified && stats.soldCount >= 50 && stats.avgRating >= 4.5 && stats.reviewCount >= 20) return "super_seller";
  if (stats.isVerified && stats.soldCount >= 10 && stats.avgRating >= 4.0 && stats.reviewCount >= 5) return "trusted";
  if (stats.isVerified || (stats.memberSinceDays > 90 && stats.soldCount >= 3)) return "verified";
  if (stats.memberSinceDays > 30 || stats.listingCount >= 2) return "basic";
  return "new";
}

export function moderateListingContent(
  title: string,
  description: string,
  price: number,
  category: string,
): ModerationResult {
  const text = `${title} ${description}`.toLowerCase();
  const flags: string[] = [];
  let trustScore = 100;

  for (const pat of PROHIBITED_PATTERNS) {
    if (pat.test(text)) {
      return {
        verdict: "rejected",
        flags: ["prohibited_content"],
        trustScore: 0,
        autoRejectReason: "Content violates platform policies",
      };
    }
  }

  for (const pat of SUSPICIOUS_PATTERNS) {
    if (pat.test(text)) {
      flags.push("suspicious_content");
      trustScore -= 20;
    }
  }

  if (title.length < 5) {
    flags.push("title_too_short");
    trustScore -= 10;
  }

  if (description.length < 10) {
    flags.push("description_too_short");
    trustScore -= 10;
  }

  if (/^[A-Z\s!]{10,}$/.test(title)) {
    flags.push("excessive_caps");
    trustScore -= 5;
  }

  if (price < 0) {
    flags.push("invalid_price");
    trustScore -= 15;
  }

  const HIGH_VALUE_CATEGORIES = ["vehicules", "immobilier", "electronique"];
  if (HIGH_VALUE_CATEGORIES.includes(category) && price > 0 && price < 5) {
    flags.push("suspiciously_low_price");
    trustScore -= 25;
  }

  const verdict: ModerationVerdict = trustScore < 50 ? "flagged" : "approved";

  return { verdict, flags, trustScore: Math.max(0, trustScore) };
}

export async function checkUserBlocklist(userId: string, sellerId: string): Promise<boolean> {
  const { data } = await db
    .from("user_blocks")
    .select("id")
    .or(`and(blocker_id.eq.${userId},blocked_id.eq.${sellerId}),and(blocker_id.eq.${sellerId},blocked_id.eq.${userId})`)
    .limit(1);
  return (data ?? []).length > 0;
}

export async function flagListingForReview(listingId: string, reason: string, flags: string[]) {
  await db.from("c2c_moderation_queue").insert({
    listing_id: listingId,
    reason,
    flags,
    status: "pending",
    created_at: new Date().toISOString(),
  });

  const listing = await db.from("marketplace_services").select("user_id, title").eq("id", listingId).maybeSingle().catch(() => ({ data: null }));

  platformBus.emit("c2c:listing_flagged", {
    type: "c2c:listing_flagged",
    payload: { listingId, reason, flags, sellerId: listing?.data?.user_id, listingTitle: listing?.data?.title },
  });
}

export async function getReportCount(listingId: string): Promise<number> {
  const { count } = await db
    .from("c2c_reports")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);
  return count ?? 0;
}

export async function autoModerateOnPublish(
  listingId: string,
  title: string,
  description: string,
  price: number,
  category: string,
): Promise<ModerationResult> {
  const result = moderateListingContent(title, description, price, category);

  if (result.verdict === "rejected") {
    await db.from("marketplace_services").update({ active: false, status: "rejected" }).eq("id", listingId);
    await flagListingForReview(listingId, result.autoRejectReason || "auto_rejected", result.flags);
  } else if (result.verdict === "flagged") {
    await flagListingForReview(listingId, "auto_flagged", result.flags);
  }

  return result;
}
