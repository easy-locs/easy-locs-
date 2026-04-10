import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";
import type { OnboardingVertical } from "@/data/onboarding-templates";

export async function startMerchantOnboarding(_userId: string) {
  return { step: "info", status: "pending" };
}

export interface ActivationPayload {
  profileId: string;
  vertical: OnboardingVertical;
  name: string;
  phone: string;
  address: string;
  subcategory: string;
  currency?: string;
  menuItems?: Array<{ name: string; price: number; category: string; description?: string; calories?: number }>;
  rooms?: Array<{ name: string; type: string; price_per_night: number; max_guests: number; beds: string; description?: string }>;
  hotelSettings?: { check_in: string; check_out: string; star_rating: number; amenities: string[] };
  services?: Array<{ name: string; price: number; duration_minutes: number; category: string; description?: string }>;
  serviceSettings?: { slot_interval: number; open_hour: number; close_hour: number; available_days: number[]; booking_mode: string; min_notice_hours: number; max_advance_days: number };
  paymentMethod?: "bank" | "wallet";
  iban?: string;
}

export async function activateMerchantProfile(idOrPayload: string | ActivationPayload): Promise<{ success: boolean; storefrontId?: string }> {
  if (typeof idOrPayload === "string") {
    return { success: true };
  }

  const p = idOrPayload;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const slug = p.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50) + "-" + Date.now().toString(36);

  const verticalMap: Record<OnboardingVertical, string> = {
    food: "food",
    hotel: "stay",
    services: "services",
  };

  const metadataJson: Record<string, unknown> = {};
  if (p.vertical === "hotel" && p.hotelSettings) {
    metadataJson.check_in = p.hotelSettings.check_in;
    metadataJson.check_out = p.hotelSettings.check_out;
    metadataJson.star_rating = p.hotelSettings.star_rating;
    metadataJson.amenities = p.hotelSettings.amenities;
  }
  if (p.vertical === "services" && p.serviceSettings) {
    metadataJson.booking_rules = p.serviceSettings;
  }

  const storefrontPayload = {
    user_id: user.id,
    org_id: user.id,
    name: p.name,
    slug,
    vertical: verticalMap[p.vertical],
    category: p.subcategory || p.vertical,
    subcategory: p.subcategory || "",
    entity_type: "fixed_store",
    contact_phone: p.phone || null,
    city: p.address?.split(",").pop()?.trim() || "Dubai",
    address: p.address || null,
    country: "AE",
    currency: p.currency || "AED",
    shop_visibility: "public",
    readiness_status: "live",
    onboarding_completed: true,
    is_auto_generated: false,
    is_order_enabled: p.vertical === "food",
    is_payment_enabled: true,
    is_qr_enabled: true,
    products_count: 0,
    ...(Object.keys(metadataJson).length > 0 ? { metadata_json: metadataJson } : {}),
  };

  const { data: storefront, error: sfError } = await db
    .from("storefront_pages")
    .insert(storefrontPayload)
    .select("id")
    .single();

  if (sfError || !storefront) {
    console.error("[merchant-onboarding] storefront insert failed:", sfError);
    return { success: false };
  }

  const sfId = storefront.id;
  let itemCount = 0;

  if (p.vertical === "food" && p.menuItems?.length) {
    const items = p.menuItems.map((item, i) => ({
      merchant_profile_id: sfId,
      name: item.name,
      price: item.price,
      description: item.description || "",
      is_available: true,
      sort_order: i,
    }));

    const { error: menuErr } = await db
      .from("menu_items")
      .insert(items);

    if (menuErr) {
      console.error("[merchant-onboarding] menu insert failed:", menuErr);
    } else {
      itemCount = items.length;
    }
  }

  if (p.vertical === "hotel" && p.rooms?.length) {
    const catalogItems = p.rooms.map((room, i) => ({
      shop_id: sfId,
      user_id: user.id,
      title: room.name,
      price: room.price_per_night,
      description: room.description || "",
      available: true,
      sort_order: i,
      item_type: "room",
      metadata_json: {
        room_type: room.type,
        max_guests: room.max_guests,
        beds: room.beds,
        price_per_night: room.price_per_night,
      },
    }));

    const { error: roomErr } = await db
      .from("catalog_items")
      .insert(catalogItems);

    if (roomErr) {
      console.error("[merchant-onboarding] room insert failed:", roomErr);
    } else {
      itemCount = catalogItems.length;
    }
  }

  if (p.vertical === "services" && p.services?.length) {
    const catalogItems = p.services.map((svc, i) => ({
      shop_id: sfId,
      user_id: user.id,
      title: svc.name,
      price: svc.price,
      description: svc.description || "",
      available: true,
      sort_order: i,
      item_type: "service",
      metadata_json: { duration_minutes: svc.duration_minutes, category: svc.category },
    }));

    const { error: svcErr } = await db
      .from("catalog_items")
      .insert(catalogItems);

    if (svcErr) {
      console.error("[merchant-onboarding] service insert failed:", svcErr);
    } else {
      itemCount = catalogItems.length;
    }
  }

  if (itemCount > 0) {
    await db
      .from("storefront_pages")
      .update({ products_count: itemCount, has_menu: true })
      .eq("id", sfId);
  }

  if (p.profileId && p.profileId !== "self") {
    await db
      .from("merchant_onboarding_profiles")
      .update({ onboarding_status: "live" })
      .eq("id", p.profileId);
  }

  return { success: true, storefrontId: sfId };
}
