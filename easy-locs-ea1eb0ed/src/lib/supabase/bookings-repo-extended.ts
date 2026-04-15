import { domainDb } from "@/services/db";
import type { BookingRecord } from "@/domains/shared/canonical-types";

export const bookingsRepoExtended = {
  async listByOwner(ownerOrbitId: string): Promise<BookingRecord[]> {
    const { data, error } = await domainDb.commerce
      .from("bookings")
      .select("*")
      .eq("ownerOrbitId", ownerOrbitId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return (data ?? []) as BookingRecord[];
  },

  async listByBuyer(buyerOrbitId: string): Promise<BookingRecord[]> {
    const { data, error } = await domainDb.commerce
      .from("bookings")
      .select("*")
      .eq("buyerOrbitId", buyerOrbitId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return (data ?? []) as BookingRecord[];
  },

  async getById(id: string): Promise<BookingRecord | null> {
    const { data, error } = await domainDb.commerce
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as BookingRecord | null;
  },
};
