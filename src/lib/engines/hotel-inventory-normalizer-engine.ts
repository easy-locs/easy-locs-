/**
 * Hotel Inventory Normalizer Engine — Processes hotel-vertical entities separately.
 * Handles room types, rates, policies, amenities. NEVER uses food menu logic.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

interface RoomType {
  name: string;
  description?: string;
  capacity?: number;
  bedType?: string;
  ratePerNight?: number;
  currency?: string;
  amenities?: string[];
  images?: string[];
}

interface HotelInventory {
  roomTypes: RoomType[];
  policies: {
    checkIn?: string;
    checkOut?: string;
    cancellation?: string;
    minStay?: number;
  };
  amenities: string[];
  totalRooms: number;
}

function extractRoomTypes(data: any): RoomType[] {
  if (!data) return [];

  // Handle various source formats
  const rooms: RoomType[] = [];
  const rawRooms = data.rooms || data.room_types || data.roomTypes || 
                   (Array.isArray(data) ? data : data.items || []);

  for (const r of Array.isArray(rawRooms) ? rawRooms : []) {
    const name = (r.name || r.room_name || r.title || r.type || "").trim();
    if (!name) continue;

    rooms.push({
      name,
      description: r.description || r.room_description || undefined,
      capacity: parseInt(r.capacity || r.max_guests || r.occupancy) || undefined,
      bedType: r.bed_type || r.bedType || r.bed || undefined,
      ratePerNight: parseFloat(r.rate || r.price || r.rate_per_night) || undefined,
      currency: r.currency || "AED",
      amenities: Array.isArray(r.amenities) ? r.amenities : [],
      images: Array.isArray(r.images) ? r.images : r.image ? [r.image] : [],
    });
  }

  return rooms;
}

function extractPolicies(data: any) {
  const policies = data?.policies || data?.hotel_policies || {};
  return {
    checkIn: policies.check_in || policies.checkIn || undefined,
    checkOut: policies.check_out || policies.checkOut || undefined,
    cancellation: policies.cancellation || policies.cancel_policy || undefined,
    minStay: parseInt(policies.min_stay || policies.minimum_nights) || undefined,
  };
}

function extractAmenities(data: any): string[] {
  const amenities = data?.amenities || data?.hotel_amenities || data?.facilities || [];
  return Array.isArray(amenities) ? amenities.map((a: any) => typeof a === "string" ? a : a.name || "").filter(Boolean) : [];
}

export async function runHotelInventoryNormalizer(limit = 30) {
  const { data: hotels } = await db
    .from("seed_merchants")
    .select("id, name, menu_items_json, vertical, hotel_inventory_at")
    .eq("vertical", "hotel")
    .is("hotel_inventory_at", null)
    .limit(limit);

  let normalized = 0, skipped = 0;

  for (const h of hotels ?? []) {
    const sourceData = h.menu_items_json;
    if (!sourceData) { skipped++; continue; }

    const roomTypes = extractRoomTypes(sourceData);
    const policies = extractPolicies(sourceData);
    const amenities = extractAmenities(sourceData);

    const inventory: HotelInventory = {
      roomTypes,
      policies,
      amenities,
      totalRooms: roomTypes.length,
    };

    await db.from("seed_merchants").update({
      hotel_inventory_json: inventory,
      hotel_inventory_at: new Date().toISOString(),
      menu_quality_flag: roomTypes.length > 0 ? "hotel_inventory_ok" : "no_rooms_found",
    }).eq("id", h.id);

    normalized++;
  }

  console.log(`[hotel-inventory-normalizer] normalized=${normalized} skipped=${skipped}`);
  return { normalized, skipped };
}
