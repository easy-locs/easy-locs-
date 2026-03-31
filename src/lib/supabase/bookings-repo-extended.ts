import { supabase } from "@/integrations/supabase/client";
import type { BookingRecordV2 } from "@/lib/types/domain";

 
const db = supabase as any;

export const bookingsRepoExtended = {
  async listByOwner(ownerOrbitId: string): Promise<BookingRecordV2[]> {
    const { data, error } = await db
      .from("bookings")
      .select("*")
      .eq("ownerOrbitId", ownerOrbitId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return (data ?? []) as BookingRecordV2[];
  },

  async listByBuyer(buyerOrbitId: string): Promise<BookingRecordV2[]> {
    const { data, error } = await db
      .from("bookings")
      .select("*")
      .eq("buyerOrbitId", buyerOrbitId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return (data ?? []) as BookingRecordV2[];
  },

  async getById(id: string): Promise<BookingRecordV2 | null> {
    const { data, error } = await db
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as BookingRecordV2 | null;
  },
};
