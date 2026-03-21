/**
 * launchOrchestration — Controlled rollout by country/city/zone/vertical.
 * Supports mass activation with preview, confirmation, and audit trail.
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
  totalAffected: number;
  businesses: Array<{ id: string; name: string; city: string; vertical: string; status: string }>;
}

/** Preview which businesses would be affected by a launch action */
export async function previewLaunchAction(filter: LaunchFilter): Promise<LaunchPreview> {
  let query = db.from("storefront_pages")
    .select("id, name, city, vertical, status, is_claimed, active")
    .eq("active", false);

  if (filter.country) query = query.eq("country", filter.country);
  if (filter.city) query = query.eq("city", filter.city);
  if (filter.zoneId) query = query.eq("zone_id", filter.zoneId);
  if (filter.vertical) query = query.eq("vertical", filter.vertical);
  if (filter.onlyClaimed) query = query.eq("is_claimed", true);
  query = query.limit(200);

  const { data } = await query;
  const businesses = (data || []).map((b: any) => ({
    id: b.id,
    name: b.name || "",
    city: b.city || "",
    vertical: b.vertical || "",
    status: b.status || "",
  }));

  return { totalAffected: businesses.length, businesses };
}

/** Mass activate businesses matching filter */
export async function massActivate(
  filter: LaunchFilter,
  activatedBy?: string
): Promise<{ activated: number; errors: string[] }> {
  const preview = await previewLaunchAction(filter);
  const errors: string[] = [];
  let activated = 0;

  for (const biz of preview.businesses) {
    const { error } = await db.from("storefront_pages").update({
      active: true,
      status: "active",
      shop_visibility: "public",
      updated_at: new Date().toISOString(),
    }).eq("id", biz.id);

    if (error) {
      errors.push(`${biz.name}: ${error.message}`);
    } else {
      activated++;
    }
  }

  // Audit trail
  if (activated > 0) {
    await db.from("audit_logs").insert({
      action: "mass_activation",
      user_id: activatedBy || null,
      metadata_json: {
        filter,
        activated_count: activated,
        error_count: errors.length,
        timestamp: new Date().toISOString(),
      },
    }).catch(() => {});
  }

  return { activated, errors };
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
