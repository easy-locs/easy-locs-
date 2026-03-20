/**
 * launchControl — Admin launch functions for zones and global platform.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

/** Launch a specific zone */
export async function launchZone(zoneId: string): Promise<boolean> {
  const { error } = await db
    .from("zones")
    .update({ is_launched: true, updated_at: new Date().toISOString() })
    .eq("id", zoneId);
  return !error;
}

/** Launch all zones in a city */
export async function launchCity(city: string): Promise<boolean> {
  const { error } = await db
    .from("zones")
    .update({ is_launched: true, updated_at: new Date().toISOString() })
    .eq("city", city);
  return !error;
}

/** Toggle global launch */
export async function setGlobalLaunch(enabled: boolean): Promise<boolean> {
  const { error } = await db
    .from("platform_settings")
    .update({
      value: { enabled, mode: enabled ? "live" : "prelaunch", city: "Dubai" },
      updated_at: new Date().toISOString(),
    })
    .eq("key", "global_launch");
  return !error;
}

/** Activate a claimed business (enable ordering, payments, QR) */
export async function activateBusiness(storefrontId: string): Promise<boolean> {
  const { error } = await db
    .from("storefront_pages")
    .update({
      is_order_enabled: true,
      is_payment_enabled: true,
      is_qr_enabled: true,
      status: "active",
      active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storefrontId);
  return !error;
}

/** Claim a business for a user */
export async function claimBusiness(storefrontId: string, userId: string): Promise<boolean> {
  const { error } = await db
    .from("storefront_pages")
    .update({
      is_claimed: true,
      user_id: userId,
      status: "claimed_pending_activation",
      updated_at: new Date().toISOString(),
    })
    .eq("id", storefrontId);
  return !error;
}
