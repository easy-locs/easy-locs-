import { db } from "@/services/db";
import type {
  CreateServiceCommand, WeeklySlot, BookSlotCommand,
  AvailableSlot, ProviderDashboard, ServiceUseCases,
} from "./ports";

const SERVICE_TRANSITIONS: Record<string, string[]> = {
  requested: ["confirmed", "rejected"],
  confirmed: ["in_progress", "cancelled_by_client", "cancelled_by_provider"],
  in_progress: ["completed"],
  cancelled_by_client: [],
  cancelled_by_provider: [],
  rejected: [],
  completed: [],
};

function canTransition(from: string, to: string): boolean {
  return (SERVICE_TRANSITIONS[from] || []).includes(to);
}

async function updateBookingStatus(bookingId: string, newStatus: string, extra: Record<string, any> = {}) {
  const { data: booking } = await db.from("service_bookings_v2").select("status").eq("id", bookingId).single();
  if (!booking) throw new Error("Booking not found");
  if (!canTransition(booking.status, newStatus)) {
    throw new Error(`Cannot transition from ${booking.status} to ${newStatus}`);
  }
  await db.from("service_bookings_v2").update({
    status: newStatus,
    updated_at: new Date().toISOString(),
    ...extra,
  }).eq("id", bookingId);
}

export const serviceUseCases: ServiceUseCases = {
  async createService(cmd) {
    const { data, error } = await db.from("service_catalog").insert({
      provider_id: cmd.providerId,
      title: cmd.title,
      description: cmd.description || null,
      category: cmd.category || null,
      subcategory: cmd.subcategory || null,
      duration_minutes: cmd.durationMinutes,
      price: cmd.price,
      price_type: cmd.priceType,
      at_home: cmd.atHome ?? false,
      in_office: cmd.inOffice ?? true,
      remote: cmd.remote ?? false,
      photos: cmd.photos || [],
      requirements: cmd.requirements || [],
    }).select("*").single();
    if (error) throw error;
    return data;
  },

  async updateService(serviceId, updates) {
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.subcategory !== undefined) payload.subcategory = updates.subcategory;
    if (updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.priceType !== undefined) payload.price_type = updates.priceType;
    if (updates.atHome !== undefined) payload.at_home = updates.atHome;
    if (updates.inOffice !== undefined) payload.in_office = updates.inOffice;
    if (updates.remote !== undefined) payload.remote = updates.remote;
    if (updates.photos !== undefined) payload.photos = updates.photos;
    if (updates.requirements !== undefined) payload.requirements = updates.requirements;
    await db.from("service_catalog").update(payload).eq("id", serviceId);
  },

  async deleteService(serviceId) {
    await db.from("service_catalog").update({ is_active: false }).eq("id", serviceId);
  },

  async setAvailability(providerId, weeklySlots) {
    await db.from("service_availability").delete().eq("provider_id", providerId);
    if (weeklySlots.length === 0) return;
    const rows = weeklySlots.map(s => ({
      provider_id: providerId,
      day_of_week: s.dayOfWeek,
      start_time: s.startTime,
      end_time: s.endTime,
      max_concurrent: s.maxConcurrent || 1,
    }));
    await db.from("service_availability").insert(rows);
  },

  async getAvailableSlots(serviceId, providerId, dateRange) {
    const { data: service } = await db.from("service_catalog").select("duration_minutes").eq("id", serviceId).single();
    if (!service) return [];
    const duration = service.duration_minutes || 60;

    const { data: availability = [] } = await db
      .from("service_availability")
      .select("*")
      .eq("provider_id", providerId)
      .eq("is_active", true);

    const { data: existingBookings = [] } = await db
      .from("service_bookings_v2")
      .select("booked_date, start_time, end_time")
      .eq("provider_id", providerId)
      .gte("booked_date", dateRange.from)
      .lte("booked_date", dateRange.to)
      .not("status", "in", '("cancelled_by_client","cancelled_by_provider","rejected")');

    const slots: AvailableSlot[] = [];
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().split("T")[0];
      const daySlots = (availability || []).filter((a: any) => a.day_of_week === dayOfWeek);

      for (const slot of daySlots) {
        const startMinutes = timeToMinutes(slot.start_time);
        const endMinutes = timeToMinutes(slot.end_time);

        for (let t = startMinutes; t + duration <= endMinutes; t += 30) {
          const slotStart = minutesToTime(t);
          const slotEnd = minutesToTime(t + duration);
          const isBooked = (existingBookings || []).some((b: any) =>
            b.booked_date === dateStr && timesOverlap(b.start_time, b.end_time, slotStart, slotEnd)
          );
          slots.push({ date: dateStr, startTime: slotStart, endTime: slotEnd, available: !isBooked });
        }
      }
    }
    return slots;
  },

  async bookSlot(cmd) {
    const { data: service } = await db.from("service_catalog").select("price, duration_minutes").eq("id", cmd.serviceId).single();
    const { data, error } = await db.from("service_bookings_v2").insert({
      service_id: cmd.serviceId,
      provider_id: cmd.providerId,
      client_id: cmd.clientId,
      booked_date: cmd.date,
      start_time: cmd.startTime,
      end_time: cmd.endTime,
      client_notes: cmd.clientNotes || null,
      address: cmd.address || null,
      lat: cmd.lat || null,
      lng: cmd.lng || null,
      total_price: service?.price || 0,
      status: "requested",
    }).select("*").single();
    if (error) throw error;
    return data;
  },

  async confirmBooking(bookingId) {
    await updateBookingStatus(bookingId, "confirmed");
  },

  async rejectBooking(bookingId, reason) {
    await updateBookingStatus(bookingId, "rejected", { cancel_reason: reason || null });
  },

  async cancelBooking(bookingId, cancelledBy, reason) {
    const status = cancelledBy === "client" ? "cancelled_by_client" : "cancelled_by_provider";
    await updateBookingStatus(bookingId, status, { cancelled_by: cancelledBy, cancel_reason: reason || null });
  },

  async startService(bookingId) {
    await updateBookingStatus(bookingId, "in_progress");
  },

  async completeService(bookingId, providerNotes) {
    await updateBookingStatus(bookingId, "completed", { provider_notes: providerNotes || null });
  },

  async getProviderDashboard(providerId) {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const [todayRes, weekRes, monthRes, pendingRes, nextRes] = await Promise.all([
      db.from("service_bookings_v2").select("id", { count: "exact" }).eq("provider_id", providerId).eq("booked_date", today).not("status", "in", '("cancelled_by_client","cancelled_by_provider","rejected")'),
      db.from("service_bookings_v2").select("total_price").eq("provider_id", providerId).gte("booked_date", weekAgo).eq("status", "completed"),
      db.from("service_bookings_v2").select("total_price").eq("provider_id", providerId).gte("booked_date", monthAgo).eq("status", "completed"),
      db.from("service_bookings_v2").select("id", { count: "exact" }).eq("provider_id", providerId).eq("status", "requested"),
      db.from("service_bookings_v2").select("*").eq("provider_id", providerId).gte("booked_date", today).eq("status", "confirmed").order("booked_date").order("start_time").limit(1),
    ]);

    return {
      todayBookings: todayRes.count || 0,
      weekRevenue: (weekRes.data || []).reduce((s: number, b: any) => s + (b.total_price || 0), 0),
      monthRevenue: (monthRes.data || []).reduce((s: number, b: any) => s + (b.total_price || 0), 0),
      pendingRequests: pendingRes.count || 0,
      nextAppointment: nextRes.data?.[0] || null,
    };
  },
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const a = timeToMinutes(s1), b = timeToMinutes(e1);
  const c = timeToMinutes(s2), d = timeToMinutes(e2);
  return a < d && c < b;
}
