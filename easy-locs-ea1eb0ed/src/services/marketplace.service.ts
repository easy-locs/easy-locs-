import { db } from "./db";


export interface MarketplaceServiceRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  city: string | null;
  country: string | null;
  price: number;
  currency: string;
  photo_urls: string[] | null;
  owner_id: string;
  status: string;
  created_at: string;
}

export interface MarketplaceBookingRow {
  id: string;
  service_id: string;
  customer_id: string;
  status: string;
  total_amount: number;
  currency: string;
  booking_date: string;
  created_at: string;
}

export const marketplaceService = {
  async fetchServiceById(serviceId: string) {
    const { data, error } = await db("marketplace_services")
      .select("*")
      .eq("id", serviceId)
      .maybeSingle() as { data: MarketplaceServiceRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchServicesByOwner(ownerId: string) {
    const { data, error } = await db("marketplace_services")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }) as { data: MarketplaceServiceRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchServicesByCategory(category: string, city?: string) {
    let query = db("marketplace_services")
      .select("*")
      .ilike("category", `%${category}%`)
      .eq("status", "active");
    if (city) query = query.ilike("city", `%${city}%`);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(50) as { data: MarketplaceServiceRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async createBooking(booking: Omit<MarketplaceBookingRow, "id" | "created_at">) {
    const { data, error } = await db("marketplace_bookings")
      .insert(booking)
      .select()
      .single() as { data: MarketplaceBookingRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchBookingsByUser(userId: string) {
    const { data, error } = await db("marketplace_bookings")
      .select("*, marketplace_services(*)")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false }) as { data: MarketplaceBookingRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },
};
