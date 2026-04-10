/**
 * seller-repository — Canonical data access for seller domain.
 * Extracts Supabase queries from SellerDashboard UI layer.
 */
import { db } from "@/services/db";

export interface SellerServiceRow {
  id: string;
  title: string;
  category: string;
  city: string;
  photo_url: string | null;
  status: string;
  active: boolean;
  listing_expires_at: string | null;
  auto_renew_enabled: boolean | null;
  boost_enabled: boolean | null;
  boost_multiplier: number | null;
  boost_expires_at: string | null;
  renewal_count: number | null;
  listing_type: string | null;
  user_id: string;
}

export interface SellerShopRow {
  id: string;
  name: string;
  slug: string | null;
  vertical: string | null;
  city: string | null;
  logo_url: string | null;
  active: boolean;
  shop_visibility: string | null;
  onboarding_completed: boolean | null;
  status: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
}

export async function fetchSellerServices(orgId: string): Promise<SellerServiceRow[]> {
  const { data } = await db
    .from("marketplace_services")
    .select("id, title, category, city, photo_url, status, active, listing_expires_at, auto_renew_enabled, boost_enabled, boost_multiplier, boost_expires_at, renewal_count, listing_type, user_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function fetchSellerShops(userId: string): Promise<SellerShopRow[]> {
  const { data } = await db
    .from("storefront_pages")
    .select("id, name, slug, vertical, city, logo_url, active, shop_visibility, onboarding_completed, status, phone, latitude, longitude")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}
