/**
 * launchOrchestration — Controlled rollout by country/city/zone/vertical.
 * Supports mass activation with preview, readiness gates, and audit trail.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface LaunchFilter {
  country?: string;
  city?: string;
  zoneId?: string;
  vertical?: string;
  onlyClaimed?: boolean;
  onlyReviewed?: boolean;
}

export interface LaunchPreview {
  totalEligible: number;
  totalIneligible: number;
  businesses: Array<{
    id: string;
    name: string;
    city: string;
    vertical: string;
    status: string;
    eligible: boolean;
    reason?: string;
  }>;
}

/** Readiness checks before activation */
function checkEligibility(biz: any): { eligible: boolean; reason?: string } {
  if (!biz.name?.trim()) return { eligible: false, reason: "Missing business name" };
  if (!biz.latitude || !biz.longitude) return { eligible: false, reason: "Missing coordinates" };
  if (!biz.contact_phone && !biz.email) return { eligible: false, reason: "Missing contact info" };
  if (!biz.vertical) return { eligible: false, reason: "Missing vertical/category" };

  // Must be in ready/claimed state (not raw draft)
  const validStatuses = ["ready", "claimed_pending_activation", "claimed"];
  if (!validStatuses.includes(biz.status)) {
    return { eligible: false, reason: `Status "${biz.status}" not activation-ready` };
  }

  return { eligible: true };
}

/** Preview which businesses would be affected by a launch action */
export async function previewLaunchAction(filter: LaunchFilter): Promise<LaunchPreview> {
  let query = db.from("storefront_pages")
    .select("id, name, city, vertical, status, is_claimed, active, latitude, longitude, contact_phone, email, zone_id")
    .eq("active", false);

  if (filter.country) query = query.eq("country", filter.country);
  if (filter.city) query = query.eq("city", filter.city);
  if (filter.zoneId) query = query.eq("zone_id", filter.zoneId);
  if (filter.vertical) query = query.eq("vertical", filter.vertical);
  if (filter.onlyClaimed) query = query.eq("is_claimed", true);
  query = query.limit(500);

  const { data } = await query;
  const businesses = (data || []).map((b: any) => {
    const check = checkEligibility(b);
    return {
      id: b.id,
      name: b.name || "",
      city: b.city || "",
      vertical: b.vertical || "",
      status: b.status || "",
      eligible: check.eligible,
      reason: check.reason,
    };
  });

  return {
    totalEligible: businesses.filter((b) => b.eligible).length,
    totalIneligible: businesses.filter((b) => !b.eligible).length,
    businesses,
  };
}

/** Mass activate ONLY eligible businesses matching filter */
export async function massActivate(
  filter: LaunchFilter,
  activatedBy?: string
): Promise<{ activated: number; skipped: number; errors: string[] }> {
  const preview = await previewLaunchAction(filter);
  const eligible = preview.businesses.filter((b) => b.eligible);
  const errors: string[] = [];
  let activated = 0;

  for (const biz of eligible) {
    // Check zone launch status before activating
    if (biz.city) {
      const { data: zone } = await db.from("zones")
        .select("is_launched")
        .eq("city", biz.city)
        .eq("is_launched", true)
        .limit(1)
        .maybeSingle();

      // Also check global launch
      const { data: globalSetting } = await db.from("platform_settings")
        .select("value")
        .eq("key", "global_launch")
        .maybeSingle();

      const globalEnabled = globalSetting?.value?.enabled === true;

      if (!zone && !globalEnabled) {
        errors.push(`${biz.name}: Zone/city not launched yet`);
        continue;
      }
    }

    const { error } = await db.from("storefront_pages").update({
      active: true,
      status: "active",
      shop_visibility: "public",
      is_order_enabled: true,
      is_payment_enabled: true,
      is_qr_enabled: true,
      updated_at: new Date().toISOString(),
    }).eq("id", biz.id);

    if (error) {
      errors.push(`${biz.name}: ${error.message}`);
    } else {
      activated++;
    }
  }

  // Audit trail
  if (activated > 0 || errors.length > 0) {
    await db.from("audit_logs").insert({
      action: "mass_activation",
      user_id: activatedBy || null,
      metadata_json: {
        filter,
        eligible_count: eligible.length,
        skipped_count: preview.totalIneligible,
        activated_count: activated,
        error_count: errors.length,
        timestamp: new Date().toISOString(),
      },
    }).catch(() => {});
  }

  return { activated, skipped: preview.totalIneligible, errors };
}

/** Pause all businesses in a zone */
export async function pauseZone(zoneId: string, pausedBy?: string): Promise<number> {
  const { data } = await db.from("storefront_pages")
    .select("id")
    .eq("zone_id", zoneId)
    .eq("active", true)
    .limit(500);

  if (!data?.length) return 0;
  let paused = 0;

  for (const biz of data) {
    const { error } = await db.from("storefront_pages").update({
      active: false,
      status: "paused",
      updated_at: new Date().toISOString(),
    }).eq("id", biz.id);
    if (!error) paused++;
  }

  await db.from("audit_logs").insert({
    action: "zone_pause",
    user_id: pausedBy || null,
    metadata_json: { zone_id: zoneId, paused_count: paused },
  }).catch(() => {});

  return paused;
}

/** Pause all businesses of a specific vertical in a city */
export async function pauseVerticalInCity(
  city: string,
  vertical: string,
  pausedBy?: string
): Promise<number> {
  const { data } = await db.from("storefront_pages")
    .select("id")
    .eq("city", city)
    .eq("vertical", vertical)
    .eq("active", true)
    .limit(500);

  if (!data?.length) return 0;
  let paused = 0;

  for (const biz of data) {
    const { error } = await db.from("storefront_pages").update({
      active: false,
      status: "paused",
      updated_at: new Date().toISOString(),
    }).eq("id", biz.id);
    if (!error) paused++;
  }

  await db.from("audit_logs").insert({
    action: "vertical_pause",
    user_id: pausedBy || null,
    metadata_json: { city, vertical, paused_count: paused },
  }).catch(() => {});

  return paused;
}
