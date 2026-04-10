/**
 * qr-payment.repository — All DB operations for QR payment flows.
 * Extracted from QrScannerPage to enforce single-responsibility.
 */
import { db } from "@/services/db";

export interface ShopLookupResult {
  user_id: string;
  name: string;
  route_status: string;
}

/** Lookup shop by slug for QR pay_shop flow */
export async function lookupShopBySlug(slug: string): Promise<ShopLookupResult | null> {
  const { data } = await db
    .from("storefront_pages")
    .select("user_id, name, route_status")
    .eq("slug", slug)
    .neq("route_status", "broken")
    .maybeSingle();
  return data || null;
}
