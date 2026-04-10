import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";
import type { OnboardingVertical } from "@/data/onboarding-templates";

export async function startMerchantOnboarding(_userId: string) {
  return { step: "info", status: "pending" };
}

export interface ShopLegalInfo {
  legalName?: string;
  registrationNumber?: string;
  taxNumber?: string;
  taxName?: string;
  taxRate?: number;
}

export interface ShopLocationInfo {
  address: string;
  city: string;
  region?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  zoneId?: string;
}

export interface ShopMediaInfo {
  logoUrl?: string;
  coverUrl?: string;
  galleryUrls?: string[];
}

export interface ShopContactInfo {
  phone: string;
  phoneSecondary?: string;
  email?: string;
  whatsapp?: string;
  telegram?: string;
}

export interface ShopBusinessInfo {
  description?: string;
  tagline?: string;
  brandName?: string;
  managerName?: string;
  tags?: string[];
  openingHours?: Record<string, { open: string; close: string; closed?: boolean }>;
}

export interface ActivationPayload {
  profileId: string;
  vertical: OnboardingVertical;
  name: string;
  subcategory: string;
  currency?: string;

  contact: ShopContactInfo;
  legal?: ShopLegalInfo;
  location: ShopLocationInfo;
  media?: ShopMediaInfo;
  business?: ShopBusinessInfo;

  menuItems?: Array<{ name: string; price: number; category: string; description?: string; calories?: number }>;
  rooms?: Array<{ name: string; type: string; price_per_night: number; max_guests: number; beds: string; description?: string }>;
  hotelSettings?: { check_in: string; check_out: string; star_rating: number; amenities: string[] };
  services?: Array<{ name: string; price: number; duration_minutes: number; category: string; description?: string }>;
  serviceSettings?: { slot_interval: number; open_hour: number; close_hour: number; available_days: number[]; booking_mode: string; min_notice_hours: number; max_advance_days: number };
  paymentMethod?: "bank" | "wallet";
  iban?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  return /^\+?[0-9]{7,15}$/.test(cleaned);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateTaxNumber(taxNumber: string): boolean {
  const cleaned = taxNumber.replace(/[\s\-]/g, "");
  return cleaned.length >= 5 && cleaned.length <= 20;
}

export function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function normalizeLegacyPayload(p: any): ActivationPayload {
  if (p.contact && p.location) return p as ActivationPayload;
  return {
    ...p,
    contact: p.contact ?? {
      phone: p.phone || "",
      email: p.email,
      whatsapp: p.whatsapp,
      phoneSecondary: p.phoneSecondary,
    },
    location: p.location ?? {
      address: p.address || "",
      city: p.city || (p.address?.split(",").pop()?.trim()) || "",
      country: p.country || "AE",
      region: p.region,
      latitude: p.latitude,
      longitude: p.longitude,
    },
    legal: p.legal,
    media: p.media,
    business: p.business,
  } as ActivationPayload;
}

export function validatePayload(p: ActivationPayload): ValidationError[] {
  const errors: ValidationError[] = [];
  const contact = p.contact ?? {} as ShopContactInfo;
  const location = p.location ?? {} as ShopLocationInfo;

  if (!p.name || p.name.trim().length < 2) {
    errors.push({ field: "name", message: "Shop name is required (min 2 characters)" });
  }

  if (!contact.phone || !validatePhone(contact.phone)) {
    errors.push({ field: "phone", message: "Valid phone number is required" });
  }

  if (contact.email && !validateEmail(contact.email)) {
    errors.push({ field: "email", message: "Invalid email format" });
  }

  if (!location.address || location.address.trim().length < 3) {
    errors.push({ field: "address", message: "Address is required" });
  }

  if (!location.city || location.city.trim().length < 2) {
    errors.push({ field: "city", message: "City is required" });
  }

  if (!location.country || location.country.trim().length < 2) {
    errors.push({ field: "country", message: "Country is required" });
  }

  const hasLat = location.latitude != null;
  const hasLng = location.longitude != null;
  if (hasLat !== hasLng) {
    errors.push({ field: "coordinates", message: "Both latitude and longitude are required" });
  } else if (hasLat && hasLng) {
    if (!validateCoordinates(location.latitude!, location.longitude!)) {
      errors.push({ field: "coordinates", message: "Invalid coordinates" });
    }
  }

  if (p.legal?.taxNumber && !validateTaxNumber(p.legal.taxNumber)) {
    errors.push({ field: "taxNumber", message: "Invalid tax number format" });
  }

  if (contact.phoneSecondary && !validatePhone(contact.phoneSecondary)) {
    errors.push({ field: "phoneSecondary", message: "Invalid secondary phone format" });
  }

  return errors;
}

export function computeCompletenessScore(p: ActivationPayload): number {
  let filled = 0;
  let total = 0;

  const check = (value: unknown, weight = 1) => {
    total += weight;
    const isFilled = value != null && value !== "" && value !== false &&
      (typeof value !== "string" || value.trim().length > 0);
    if (isFilled) filled += weight;
  };

  const contact = p.contact ?? {} as ShopContactInfo;
  const location = p.location ?? {} as ShopLocationInfo;

  check(p.name, 3);
  check(contact.phone, 3);
  check(contact.email, 2);
  check(location.address, 3);
  check(location.city, 2);
  check(location.country, 2);
  check(location.latitude != null ? String(location.latitude) : null, 1);
  check(location.longitude != null ? String(location.longitude) : null, 1);
  check(p.business?.description, 2);
  check(p.business?.managerName, 1);
  check(p.business?.tagline, 1);
  check(p.media?.logoUrl, 2);
  check(p.media?.coverUrl, 2);
  check(p.media?.galleryUrls?.length ? "yes" : null, 1);
  check(p.legal?.legalName, 1);
  check(p.legal?.registrationNumber, 1);
  check(p.legal?.taxNumber, 1);
  check(p.subcategory, 1);

  if (p.vertical === "food") {
    check(p.business?.openingHours && Object.keys(p.business.openingHours).length > 0 ? "yes" : null, 2);
  }

  return Math.round((filled / total) * 100);
}

export async function activateMerchantProfile(idOrPayload: string | ActivationPayload): Promise<{ success: boolean; storefrontId?: string; errors?: ValidationError[]; completeness?: number }> {
  if (typeof idOrPayload === "string") {
    return { success: true };
  }

  const p = normalizeLegacyPayload(idOrPayload);

  const validationErrors = validatePayload(p);
  if (validationErrors.length > 0) {
    console.error("[merchant-onboarding] validation failed:", validationErrors);
    return { success: false, errors: validationErrors };
  }

  const completeness = computeCompletenessScore(p);

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

  if (p.legal) {
    metadataJson.legal = {
      legal_name: p.legal.legalName || null,
      registration_number: p.legal.registrationNumber || null,
      tax_number: p.legal.taxNumber || null,
    };
  }

  if (p.business?.managerName) {
    metadataJson.manager_name = p.business.managerName;
  }

  if (p.vertical === "food" && p.business?.openingHours && Object.keys(p.business.openingHours).length > 0) {
    metadataJson.opening_hours = p.business.openingHours;
  }

  if (p.vertical === "hotel" && p.hotelSettings) {
    metadataJson.check_in = p.hotelSettings.check_in;
    metadataJson.check_out = p.hotelSettings.check_out;
    metadataJson.star_rating = p.hotelSettings.star_rating;
    metadataJson.amenities = p.hotelSettings.amenities;
  }

  if (p.vertical === "services" && p.serviceSettings) {
    metadataJson.booking_rules = p.serviceSettings;
  }

  metadataJson.completeness_score = completeness;
  metadataJson.onboarding_source = "self_service";
  metadataJson.onboarding_completed_at = new Date().toISOString();

  const storefrontPayload: Record<string, unknown> = {
    user_id: user.id,
    org_id: user.id,
    name: p.name,
    slug,
    vertical: verticalMap[p.vertical],
    category: p.subcategory || p.vertical,
    subcategory: p.subcategory || "",
    entity_type: "fixed_store",

    contact_phone: p.contact.phone || null,
    contact_email: p.contact.email || null,
    contact_whatsapp: p.contact.whatsapp || null,
    contact_telegram: p.contact.telegram || null,

    address: p.location.address || null,
    city: p.location.city || null,
    region: p.location.region || null,
    country: p.location.country || "AE",
    latitude: p.location.latitude ?? null,
    longitude: p.location.longitude ?? null,

    description: p.business?.description || null,
    tagline: p.business?.tagline || null,
    brand_name: p.business?.brandName || null,
    tags: p.business?.tags || null,

    logo_url: p.media?.logoUrl || null,
    logo_owner_url: p.media?.logoUrl || null,
    cover_owner_url: p.media?.coverUrl || null,
    banner_url: p.media?.coverUrl || null,
    gallery_urls: p.media?.galleryUrls?.length ? p.media.galleryUrls : null,
    has_photo: !!(p.media?.logoUrl || p.media?.coverUrl || (p.media?.galleryUrls?.length ?? 0) > 0),

    tax_name: p.legal?.taxName || null,
    tax_rate: p.legal?.taxRate ?? null,

    currency: p.currency || "AED",
    shop_visibility: "public",
    readiness_status: "live",
    launch_status: "live",
    onboarding_completed: true,
    is_auto_generated: false,
    is_order_enabled: p.vertical === "food",
    is_payment_enabled: true,
    is_qr_enabled: true,
    is_claimed: true,
    claimed_by_owner: true,
    products_count: 0,
    audit_score: completeness,

    metadata_json: metadataJson,
    provenance_json: {
      source: "self_onboarding",
      created_at: new Date().toISOString(),
      user_id: user.id,
      completeness_score: completeness,
    },

    activated_at: new Date().toISOString(),
    activated_by: user.id,
    activation_channel: "self_service",
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

  return { success: true, storefrontId: sfId, completeness };
}
