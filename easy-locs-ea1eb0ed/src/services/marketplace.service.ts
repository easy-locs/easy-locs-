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
      .select("id, title, description, category, city, country, price, currency, photo_urls, owner_id, status, created_at")
      .eq("id", serviceId)
      .maybeSingle() as { data: MarketplaceServiceRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchServicesByOwner(ownerId: string, opts?: { limit?: number; offset?: number }) {
    let q = db("marketplace_services")
      .select("id, title, description, category, city, country, price, currency, photo_urls, owner_id, status, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    const limit = opts?.limit ?? 30;
    q = q.limit(limit);
    if (opts?.offset) q = q.range(opts.offset, opts.offset + limit - 1);
    const { data, error } = await q as { data: MarketplaceServiceRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchServicesByCategory(category: string, city?: string) {
    let query = db("marketplace_services")
      .select("id, title, description, category, city, country, price, currency, photo_urls, status, created_at")
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

  async fetchBookingsByUser(userId: string, opts?: { limit?: number; offset?: number }) {
    const limit = opts?.limit ?? 30;
    let q = db("marketplace_bookings")
      .select("id, service_id, customer_id, status, total_amount, currency, booking_date, created_at, marketplace_services(id, title, category, price, currency)")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (opts?.offset) q = q.range(opts.offset, opts.offset + limit - 1);
    const { data, error } = await q as { data: MarketplaceBookingRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },
};
