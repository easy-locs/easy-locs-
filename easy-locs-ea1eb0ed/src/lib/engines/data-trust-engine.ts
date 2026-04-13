import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

interface TrustResult {
  shopId: string;
  shopName: string;
  trustScore: number;
  signals: string[];
}

export async function runDataTrust(batchSize = 100) {
  return runDataTrustScan(batchSize);
}

export async function runDataTrustScan(batchSize = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, phone, address, website, cover_image_url, logo_url, description, rating, reviews_count, source, vertical")
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], scanned: 0 };
  }

  const results: TrustResult[] = [];

  for (const m of merchants) {
    let score = 0;
    const signals: string[] = [];

    if (m.name && m.name.trim().length >= 2) { score += 15; signals.push("has_name"); }
    if (m.phone) { score += 15; signals.push("has_phone"); }
    if (m.address) { score += 15; signals.push("has_address"); }
    if (m.website) { score += 5; signals.push("has_website"); }
    if (m.cover_image_url) { score += 10; signals.push("has_cover"); }
    if (m.logo_url) { score += 10; signals.push("has_logo"); }
    if (m.description && m.description.length > 20) { score += 10; signals.push("has_description"); }
    if ((m.rating ?? 0) > 0) { score += 10; signals.push("has_rating"); }
    if ((m.reviews_count ?? 0) >= 3) { score += 5; signals.push("has_reviews"); }
    if (m.source && m.source !== "manual") { score += 5; signals.push("verified_source"); }

    score = Math.min(100, score);

    results.push({ shopId: m.id, shopName: m.name ?? "", trustScore: score, signals });
  }

  const lowTrustCount = results.filter(r => r.trustScore < 40).length;
  if (lowTrustCount > 0) {
    platformBus.emit("storefront:trust_updated", { scanned: results.length, lowTrust: lowTrustCount }, "engine");
  }

  return { status: "completed", results, scanned: results.length };
}
