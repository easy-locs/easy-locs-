/**
 * Legacy Storefront Repair Tool — fix storefront_pages missing merchant_profile_id.
 */
import { db } from "@/services/db";

export interface RepairResult {
  repaired: { storefrontId: string; merchantId: string; matchedBy: string }[];
  unresolved: { storefrontId: string; name: string; reason: string }[];
  duplicates: { storefrontId: string; name: string; matchCount: number }[];
}

export async function repairStorefrontLinkage(): Promise<RepairResult> {
  const result: RepairResult = { repaired: [], unresolved: [], duplicates: [] };

  // Find storefronts without merchant_profile_id
  const { data: orphans } = await db
    .from("storefront_pages")
    .select("id, name, source_id")
    .is("merchant_profile_id", null)
    .limit(500);

  if (!orphans?.length) return result;

  // Load all merchant profiles for matching
  const { data: profiles } = await db
    .from("merchant_onboarding_profiles")
    .select("id, merchant_name, phone, email, source_id")
    .limit(1000);

  if (!profiles?.length) {
    orphans.forEach((o: any) =>
      result.unresolved.push({ storefrontId: o.id, name: o.name, reason: "No merchant profiles found" })
    );
    return result;
  }

  for (const orphan of orphans) {
    // Try source_id match first (highest confidence)
    let matches = orphan.source_id
      ? profiles.filter((p: any) => p.source_id === orphan.source_id)
      : [];

    // Fallback: exact name match
    if (!matches.length) {
      matches = profiles.filter(
        (p: any) => p.merchant_name?.toLowerCase() === orphan.name?.toLowerCase()
      );
    }

    if (matches.length === 1) {
      const { error } = await db
        .from("storefront_pages")
        .update({ merchant_profile_id: matches[0].id })
        .eq("id", orphan.id);

      if (!error) {
        result.repaired.push({
          storefrontId: orphan.id,
          merchantId: matches[0].id,
          matchedBy: orphan.source_id ? "source_id" : "name",
        });
      } else {
        result.unresolved.push({ storefrontId: orphan.id, name: orphan.name, reason: error.message });
      }
    } else if (matches.length > 1) {
      result.duplicates.push({ storefrontId: orphan.id, name: orphan.name, matchCount: matches.length });
    } else {
      result.unresolved.push({ storefrontId: orphan.id, name: orphan.name, reason: "No matching merchant profile" });
    }
  }

  return result;
}
