/**
 * Hotel Domain Service — Use-case implementations.
 * State machine, availability checking with anti-overbooking guards,
 * dashboard aggregation, room CRUD, seasonal pricing.
 *
 * Ownership model: hotels.owner_user_id = auth.uid()
 * Schema: public.hotels → public.hotel_rooms (hotel_id) → hotel_bookings (hotel_id)
 */
import type {
  HotelUseCases,
  HotelBooking,
  HotelBookingStatus,
  HotelRoom,
  AvailabilityResult,
  DashboardData,
  CancellationResult,
  CheckInInfo,
  SeasonalPricing,
  HotelPolicy,
  RoomAvailability,
} from "./ports";
import type { DomainResult } from "../shared/types";
import { hotelEvents } from "./events";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, type SecurityContext } from "../shared/security-guards";
import { createActionGuard, acquireSinglePath } from "@/lib/guards/action-guard";
import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import { format, differenceInDays, addDays, parseISO } from "date-fns";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
const log = createDomainLogger("hotel");

interface DbBookingRow {
  id: string;
  user_id: string;
  hotel_id: string;
  room_type_id: string;
  rate_plan_id: string | null;
  checkin_date: string;
  checkout_date: string;
  adults: number;
  children: number;
  total_price: number | string;
  currency: string;
  status: HotelBookingStatus;
  booking_reference: string;
  guest_name: string | null;
  guest_email: string | null;
  created_at: string;
}

interface DbRoomRow {
  id: string;
  hotel_id: string;
  name: string;
  description: string | null;
  capacity: number;
  adults: number;
  children: number;
  bed_type: string;
  total_units: number;
  base_price_per_night: number | string | null;
  weekend_price_per_night: number | string | null;
  currency?: string;
  amenities_json: string[];
  images_json: string[];
  room_size_sqm: number | string | null;
  size_m2: number | string | null;
  has_balcony: boolean;
  has_sea_view: boolean;
  has_minibar: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
}

const HOTEL_BOOKING_TRANSITIONS: Record<HotelBookingStatus, HotelBookingStatus[]> = {
  pending: ["confirmed", "rejected"],
  confirmed: ["checked_in", "cancelled_by_guest", "cancelled_by_hotel"],
  checked_in: ["checked_out"],
  checked_out: [],
  cancelled_by_guest: [],
  cancelled_by_hotel: [],
  rejected: [],
};

function canTransition(from: HotelBookingStatus, to: HotelBookingStatus): boolean {
  return HOTEL_BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}

function generateBookingRef(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "HTL-";
  for (let i = 0; i < 8; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

function getDateRange(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const start = parseISO(checkIn);
  const nights = differenceInDays(parseISO(checkOut), start);
  for (let i = 0; i < nights; i++) {
    dates.push(format(addDays(start, i), "yyyy-MM-dd"));
  }
  return dates;
}

function mapBooking(row: DbBookingRow): HotelBooking {
  return {
    id: row.id,
    userId: row.user_id,
    hotelId: row.hotel_id,
    roomTypeId: row.room_type_id,
    checkIn: row.checkin_date,
    checkOut: row.checkout_date,
    adults: row.adults,
    children: row.children,
    totalPrice: Number(row.total_price),
    currency: row.currency ?? "AED",
    status: row.status,
    bookingReference: row.booking_reference,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    createdAt: row.created_at,
  };
}

function mapRoom(row: DbRoomRow): HotelRoom {
  return {
    id: row.id,
    hotelId: row.hotel_id,
    name: row.name,
    description: row.description,
    capacity: row.capacity,
    adults: row.adults ?? row.capacity,
    children: row.children ?? 0,
    bedType: row.bed_type ?? "double",
    totalUnits: row.total_units ?? 1,
    basePricePerNight: row.base_price_per_night ? Number(row.base_price_per_night) : null,
    weekendPricePerNight: row.weekend_price_per_night ? Number(row.weekend_price_per_night) : null,
    currency: row.currency ?? "AED",
    amenitiesJson: row.amenities_json ?? [],
    imagesJson: row.images_json ?? [],
    roomSizeSqm: row.room_size_sqm ? Number(row.room_size_sqm) : (row.size_m2 ? Number(row.size_m2) : null),
    hasBalcony: row.has_balcony ?? false,
    hasSeaView: row.has_sea_view ?? false,
    hasMinibar: row.has_minibar ?? false,
    active: row.active ?? true,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

const bookingGuard = createActionGuard("hotel.booking");

async function resolveOwnedHotelIds(userId: string): Promise<string[]> {
  const { data } = await cFrom("hotels")
    .select("id")
    .eq("owner_user_id", userId);
  return (data ?? []).map((h: { id: string }) => h.id);
}

async function verifyHotelOwnership(userId: string, hotelId: string): Promise<boolean> {
  const { data } = await cFrom("hotels")
    .select("id")
    .eq("id", hotelId)
    .eq("owner_user_id", userId)
    .single();
  return !!data;
}

async function verifyRoomOwnership(userId: string, roomId: string): Promise<boolean> {
  const { data: room } = await cFrom("hotel_rooms")
    .select("hotel_id")
    .eq("id", roomId)
    .single();
  if (!room) return false;
  return verifyHotelOwnership(userId, room.hotel_id);
}

async function verifyBookingOwnership(userId: string, bookingId: string): Promise<boolean> {
  const { data: booking } = await cFrom("hotel_bookings")
    .select("hotel_id")
    .eq("id", bookingId)
    .single();
  if (!booking) return false;
  return verifyHotelOwnership(userId, booking.hotel_id);
}

export function createHotelService(ctx: SecurityContext | null): HotelUseCases {
  return {
    async getOwnedHotelId() {
      requireAuth(ctx);
      try {
        const hotelIds = await resolveOwnedHotelIds(ctx!.userId);
        if (hotelIds.length === 0) return { ok: false, error: "No hotel found for this user" };
        return { ok: true, data: hotelIds[0] };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async checkAvailability(hotelId, roomTypeId, checkIn, checkOut, guestCount, ratePlanId) {
      try {
        const nights = differenceInDays(parseISO(checkOut), parseISO(checkIn));
        if (nights <= 0) return { ok: false, error: "Invalid date range" };

        const { data: room, error: roomErr } = await cFrom("hotel_rooms")
          .select("*")
          .eq("id", roomTypeId)
          .eq("active", true)
          .single();

        if (roomErr || !room) return { ok: false, error: "Room type not found" };
        if (guestCount > (room.adults ?? room.capacity) + (room.children ?? 0)) {
          return { ok: false, error: "Exceeds room capacity" };
        }

        const totalUnits = room.total_units ?? 1;
        const dates = getDateRange(checkIn, checkOut);

        if (ratePlanId) {
          const { data: invRows, error: invErr } = await cFrom("hotel_inventory_calendar")
            .select("night_date, available, available_units, base_price, final_price, taxes_amount, fees_amount, currency, closed_to_arrival, closed_to_departure, min_stay")
            .eq("hotel_id", hotelId)
            .eq("room_type_id", roomTypeId)
            .eq("rate_plan_id", ratePlanId)
            .gte("night_date", checkIn)
            .lt("night_date", checkOut)
            .order("night_date");

          if (!invErr && invRows && invRows.length === nights) {
            let totalPrice = 0;
            for (const row of invRows) {
              if (!row.available || (row.available_units != null && row.available_units <= 0)) {
                return { ok: true, data: { available: false, pricePerNight: 0, totalPrice: 0, nights, appliedSeasonalPricing: null } };
              }
              if (row.night_date === checkIn && row.closed_to_arrival) {
                return { ok: true, data: { available: false, pricePerNight: 0, totalPrice: 0, nights, appliedSeasonalPricing: null } };
              }
              if (row.min_stay != null && nights < row.min_stay) {
                return { ok: false, error: `Minimum stay is ${row.min_stay} nights` };
              }
              totalPrice += Number(row.final_price ?? row.base_price ?? 0);
            }

            return {
              ok: true,
              data: {
                available: true,
                pricePerNight: Math.round(totalPrice / nights),
                totalPrice: Math.round(totalPrice),
                nights,
                appliedSeasonalPricing: "inventory_calendar",
              },
            };
          }
        }

        const { data: blocked, error: blockErr } = await cFrom("hotel_room_availability")
          .select("date, status")
          .eq("room_id", roomTypeId)
          .in("date", dates)
          .eq("status", "blocked");

        if (blockErr) return { ok: false, error: blockErr.message };
        if (blocked && blocked.length > 0) {
          return { ok: true, data: { available: false, pricePerNight: 0, totalPrice: 0, nights, appliedSeasonalPricing: null } };
        }

        const { data: bookedRows, error: bookedErr } = await cFrom("hotel_room_availability")
          .select("date")
          .eq("room_id", roomTypeId)
          .in("date", dates)
          .in("status", ["booked", "maintenance"]);

        if (bookedErr) return { ok: false, error: bookedErr.message };
        const bookedCountByDate: Record<string, number> = {};
        for (const r of bookedRows ?? []) {
          bookedCountByDate[r.date] = (bookedCountByDate[r.date] ?? 0) + 1;
        }
        for (const dateStr of dates) {
          if ((bookedCountByDate[dateStr] ?? 0) >= totalUnits) {
            return { ok: true, data: { available: false, pricePerNight: 0, totalPrice: 0, nights, appliedSeasonalPricing: null } };
          }
        }

        const { data: seasonal } = await cFrom("hotel_seasonal_pricing")
          .select("*")
          .eq("room_id", roomTypeId)
          .lte("start_date", checkOut)
          .gte("end_date", checkIn);

        const basePrice = room.base_price_per_night ? Number(room.base_price_per_night) : 0;
        const weekendPrice = room.weekend_price_per_night ? Number(room.weekend_price_per_night) : null;

        let totalPrice = 0;
        let appliedSeason: string | null = null;
        for (const dateStr of dates) {
          const d = parseISO(dateStr);
          const isWeekend = d.getDay() === 5 || d.getDay() === 6;
          let nightPrice = isWeekend && weekendPrice ? weekendPrice : basePrice;

          if (seasonal) {
            for (const sp of seasonal) {
              if (dateStr >= sp.start_date && dateStr <= sp.end_date) {
                nightPrice = Number(sp.price_per_night);
                appliedSeason = sp.period_name;
                break;
              }
            }
          }
          totalPrice += nightPrice;
        }

        return {
          ok: true,
          data: {
            available: true,
            pricePerNight: Math.round(totalPrice / nights),
            totalPrice: Math.round(totalPrice),
            nights,
            appliedSeasonalPricing: appliedSeason,
          },
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async createBooking(cmd) {
      requireAuth(ctx);
      const flowKey = `hotel.book:${ctx!.userId}:${cmd.roomTypeId}:${cmd.checkIn}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: false, error: "booking_already_in_progress" };

      try {
        const result = await bookingGuard.execute(async () => {
          const timer = log.timed("create_booking", { roomTypeId: cmd.roomTypeId, checkIn: cmd.checkIn });

          try {
            const { data: roomData } = await cFrom("hotel_rooms")
              .select("hotel_id, total_units")
              .eq("id", cmd.roomTypeId)
              .single();
            if (!roomData) throw new Error("Room type not found");
            if (roomData.hotel_id !== cmd.hotelId) throw new Error("Room does not belong to specified hotel");

            const avail = await this.checkAvailability(cmd.hotelId, cmd.roomTypeId, cmd.checkIn, cmd.checkOut, cmd.adults + cmd.children, cmd.ratePlanId);
            if (!avail.ok) throw new Error(avail.error);
            if (!avail.data.available) throw new Error("Room not available for selected dates");

            const bookingRef = generateBookingRef();
            const nights = differenceInDays(parseISO(cmd.checkOut), parseISO(cmd.checkIn));
            const pricePerNight = Math.round(avail.data.totalPrice / nights);

            const insertPayload: Record<string, unknown> = {
                user_id: ctx!.userId,
                hotel_id: cmd.hotelId,
                room_type_id: cmd.roomTypeId,
                checkin_date: cmd.checkIn,
                checkout_date: cmd.checkOut,
                nights,
                adults: cmd.adults,
                children: cmd.children,
                price_per_night: pricePerNight,
                total_price: avail.data.totalPrice,
                currency: "AED",
                status: "pending",
                booking_reference: bookingRef,
                guest_name: cmd.guestInfo.name,
                guest_email: cmd.guestInfo.email,
            };
            if (cmd.ratePlanId) {
              insertPayload.rate_plan_id = cmd.ratePlanId;
            }

            const { data: booking, error: bookErr } = await cFrom("hotel_bookings")
              .insert(insertPayload)
              .select()
              .single();

            if (bookErr || !booking) throw new Error(bookErr?.message ?? "Failed to create booking");

            const dates = getDateRange(cmd.checkIn, cmd.checkOut);
            const totalUnits = roomData.total_units ?? 1;

            const { data: reserved, error: reserveErr } = await cRpc("reserve_hotel_dates", {
              p_room_id: cmd.roomTypeId,
              p_dates: dates,
              p_booking_id: booking.id,
              p_total_units: totalUnits,
            });

            if (reserveErr || reserved === false) {
              await cFrom("hotel_bookings").delete().eq("id", booking.id);
              throw new Error("Failed to reserve dates — room may have been booked by someone else");
            }

            const mapped = mapBooking(booking as DbBookingRow);
            hotelEvents.bookingCreated(mapped, cmd.hotelId);
            timer.done();
            return mapped;
          } catch (err) {
            timer.fail(err);
            throw err;
          }
        });

        if (result.deduplicated) return { ok: true, data: result.data! };
        return { ok: true, data: result.data! };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      } finally {
        release?.();
      }
    },

    async confirmBooking(bookingId) {
      requireAuth(ctx);
      try {
        const isOwner = await verifyBookingOwnership(ctx!.userId, bookingId);
        if (!isOwner) return { ok: false, error: "Not authorized to manage this booking" };

        const { data: booking, error } = await cFrom("hotel_bookings")
          .select("*")
          .eq("id", bookingId)
          .single();
        if (error || !booking) return { ok: false, error: "Booking not found" };
        if (!canTransition(booking.status, "confirmed")) {
          return { ok: false, error: `Cannot confirm a ${booking.status} booking` };
        }

        const { data: updated, error: updErr } = await cFrom("hotel_bookings")
          .update({ status: "confirmed" })
          .eq("id", bookingId)
          .select()
          .single();
        if (updErr) return { ok: false, error: updErr.message };

        const mapped = mapBooking(updated as DbBookingRow);
        hotelEvents.bookingConfirmed(mapped);
        return { ok: true, data: mapped };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async rejectBooking(bookingId, reason) {
      requireAuth(ctx);
      try {
        const isOwner = await verifyBookingOwnership(ctx!.userId, bookingId);
        if (!isOwner) return { ok: false, error: "Not authorized to manage this booking" };

        const { data: booking, error } = await cFrom("hotel_bookings")
          .select("*")
          .eq("id", bookingId)
          .single();
        if (error || !booking) return { ok: false, error: "Booking not found" };
        if (!canTransition(booking.status, "rejected")) {
          return { ok: false, error: `Cannot reject a ${booking.status} booking` };
        }

        const { data: updated, error: updErr } = await cFrom("hotel_bookings")
          .update({ status: "rejected" })
          .eq("id", bookingId)
          .select()
          .single();
        if (updErr) return { ok: false, error: updErr.message };

        await cFrom("hotel_room_availability")
          .delete()
          .eq("booking_id", bookingId);

        const mapped = mapBooking(updated as DbBookingRow);
        hotelEvents.bookingRejected(mapped, reason);

        platformBus.emit("refund:requested", {
          referenceType: "hotel_booking",
          referenceId: bookingId,
          userId: mapped.userId,
          amount: mapped.totalPrice,
          currency: mapped.currency,
          reason: "booking_rejected",
        }, "wallet");

        return { ok: true, data: mapped };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async cancelBooking(bookingId, cancelledBy) {
      requireAuth(ctx);
      try {
        if (cancelledBy === "hotel") {
          const isOwner = await verifyBookingOwnership(ctx!.userId, bookingId);
          if (!isOwner) return { ok: false, error: "Not authorized to cancel this booking" };
        } else {
          const { data: bk } = await cFrom("hotel_bookings").select("user_id").eq("id", bookingId).single();
          if (!bk || bk.user_id !== ctx!.userId) return { ok: false, error: "Not authorized to cancel this booking" };
        }

        const { data: booking, error } = await cFrom("hotel_bookings")
          .select("*")
          .eq("id", bookingId)
          .single();
        if (error || !booking) return { ok: false, error: "Booking not found" };

        const newStatus: HotelBookingStatus = cancelledBy === "guest" ? "cancelled_by_guest" : "cancelled_by_hotel";
        if (!canTransition(booking.status, newStatus)) {
          return { ok: false, error: `Cannot cancel a ${booking.status} booking` };
        }

        const { data: policy } = await cFrom("hotel_policies")
          .select("*")
          .eq("hotel_id", booking.hotel_id)
          .single();

        let penaltyPercent = 0;
        if (policy) {
          const checkInDate = parseISO(booking.checkin_date);
          const hoursUntil = (checkInDate.getTime() - Date.now()) / 3600000;
          if (hoursUntil < 24) {
            penaltyPercent = policy.late_cancellation_penalty_percent;
          } else if (hoursUntil < policy.cancellation_hours_before) {
            penaltyPercent = policy.cancellation_penalty_percent;
          }
        }

        const refundAmount = Math.round(Number(booking.total_price) * (1 - penaltyPercent / 100));

        const { error: updErr } = await cFrom("hotel_bookings")
          .update({ status: newStatus })
          .eq("id", bookingId);
        if (updErr) return { ok: false, error: updErr.message };

        await cFrom("hotel_room_availability")
          .delete()
          .eq("booking_id", bookingId);

        const mapped = mapBooking({ ...booking, status: newStatus } as DbBookingRow);
        hotelEvents.bookingCancelled(mapped, cancelledBy, penaltyPercent);

        if (refundAmount > 0) {
          platformBus.emit("refund:requested", {
            referenceType: "hotel_booking",
            referenceId: bookingId,
            userId: mapped.userId,
            amount: refundAmount,
            currency: mapped.currency,
            reason: cancelledBy === "guest" ? "guest_cancellation" : "hotel_cancellation",
            penaltyPercent,
          }, "wallet");
        }

        return {
          ok: true,
          data: { refundAmount, penaltyPercent, refundedToWallet: refundAmount > 0 },
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async checkInGuest(bookingId, roomNumber) {
      requireAuth(ctx);
      try {
        const isOwner = await verifyBookingOwnership(ctx!.userId, bookingId);
        if (!isOwner) return { ok: false, error: "Not authorized to manage this booking" };

        const { data: booking, error } = await cFrom("hotel_bookings")
          .select("*")
          .eq("id", bookingId)
          .single();
        if (error || !booking) return { ok: false, error: "Booking not found" };
        if (!canTransition(booking.status, "checked_in")) {
          return { ok: false, error: `Cannot check-in a ${booking.status} booking` };
        }

        const { data: policy } = await cFrom("hotel_policies")
          .select("*")
          .eq("hotel_id", booking.hotel_id)
          .single();

        const { error: updErr } = await cFrom("hotel_bookings")
          .update({ status: "checked_in" })
          .eq("id", bookingId);
        if (updErr) return { ok: false, error: updErr.message };

        const info: CheckInInfo = {
          roomNumber: roomNumber ?? null,
          wifiCode: policy?.wifi_code ?? null,
          breakfastHours: policy?.breakfast_hours ?? null,
          emergencyPhone: policy?.emergency_phone ?? null,
          floorPlanUrl: policy?.floor_plan_url ?? null,
          checkOutTime: policy?.check_out_time ?? "11:00",
        };

        const mapped = mapBooking({ ...booking, status: "checked_in" } as DbBookingRow);
        hotelEvents.guestCheckedIn(mapped, info);
        return { ok: true, data: info };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async checkOutGuest(bookingId) {
      requireAuth(ctx);
      try {
        const isOwner = await verifyBookingOwnership(ctx!.userId, bookingId);
        if (!isOwner) return { ok: false, error: "Not authorized to manage this booking" };

        const { data: booking, error } = await cFrom("hotel_bookings")
          .select("*")
          .eq("id", bookingId)
          .single();
        if (error || !booking) return { ok: false, error: "Booking not found" };
        if (!canTransition(booking.status, "checked_out")) {
          return { ok: false, error: `Cannot check-out a ${booking.status} booking` };
        }

        const { data: updated, error: updErr } = await cFrom("hotel_bookings")
          .update({ status: "checked_out" })
          .eq("id", bookingId)
          .select()
          .single();
        if (updErr) return { ok: false, error: updErr.message };

        const mapped = mapBooking(updated as DbBookingRow);
        hotelEvents.guestCheckedOut(mapped);
        return { ok: true, data: mapped };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getHotelDashboard(hotelId) {
      requireAuth(ctx);
      try {
        const isOwner = await verifyHotelOwnership(ctx!.userId, hotelId);
        if (!isOwner) return { ok: false, error: "Not authorized to view this dashboard" };

        const today = format(new Date(), "yyyy-MM-dd");
        const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
        const monthEnd = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd");

        const { data: rooms } = await cFrom("hotel_rooms")
          .select("id, total_units")
          .eq("hotel_id", hotelId)
          .eq("active", true);

        const roomIds = rooms?.map((r: { id: string }) => r.id) ?? [];
        const totalRooms = rooms?.reduce((sum: number, r: { total_units: number }) => sum + (r.total_units ?? 1), 0) ?? 0;

        let occupiedRooms = 0;
        if (roomIds.length > 0) {
          const { count } = await cFrom("hotel_room_availability")
            .select("*", { count: "exact", head: true })
            .in("room_id", roomIds)
            .eq("date", today)
            .eq("status", "booked");
          occupiedRooms = count ?? 0;
        }

        const { data: allBookings } = await cFrom("hotel_bookings")
          .select("*")
          .eq("hotel_id", hotelId);

        const bookings = (allBookings ?? []).map((b: DbBookingRow) => mapBooking(b));

        const arrivalsToday = bookings.filter(b => b.checkIn === today && b.status === "confirmed");
        const departuresToday = bookings.filter(b => b.checkOut === today && b.status === "checked_in");
        const pendingBookings = bookings.filter(b => b.status === "pending");

        const { data: revenueData } = await cFrom("hotel_bookings")
          .select("total_price")
          .eq("hotel_id", hotelId)
          .in("status", ["confirmed", "checked_in", "checked_out"])
          .gte("checkin_date", monthStart)
          .lte("checkin_date", monthEnd);

        const monthRevenue = revenueData?.reduce((sum: number, b: { total_price: number | string }) => sum + Number(b.total_price), 0) ?? 0;

        return {
          ok: true,
          data: {
            occupiedRooms,
            totalRooms,
            occupancyPercent: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
            arrivalsToday,
            departuresToday,
            pendingBookings,
            monthRevenue,
            currency: "AED",
          },
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async blockDates(roomTypeId, dates, reason) {
      requireAuth(ctx);
      const isOwner = await verifyRoomOwnership(ctx!.userId, roomTypeId);
      if (!isOwner) return { ok: false, error: "Not authorized to manage this room" };
      try {
        await cFrom("hotel_room_availability")
          .delete()
          .eq("room_id", roomTypeId)
          .in("date", dates)
          .eq("status", "blocked");

        const rows = dates.map(d => ({
          room_id: roomTypeId,
          date: d,
          status: "blocked" as const,
          notes: reason ?? null,
        }));
        const { error } = await cFrom("hotel_room_availability")
          .insert(rows);
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: undefined };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async unblockDates(roomTypeId, dates) {
      requireAuth(ctx);
      const isOwner = await verifyRoomOwnership(ctx!.userId, roomTypeId);
      if (!isOwner) return { ok: false, error: "Not authorized to manage this room" };
      try {
        const { error } = await cFrom("hotel_room_availability")
          .delete()
          .eq("room_id", roomTypeId)
          .in("date", dates)
          .eq("status", "blocked");
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: undefined };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getRooms(hotelId) {
      requireAuth(ctx);
      try {
        const isOwner = await verifyHotelOwnership(ctx!.userId, hotelId);
        if (!isOwner) return { ok: false, error: "Not authorized to view these rooms" };

        const { data, error } = await cFrom("hotel_rooms")
          .select("*")
          .eq("hotel_id", hotelId)
          .order("sort_order", { ascending: true });
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: (data ?? []).map((r: DbRoomRow) => mapRoom(r)) };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async createRoom(room) {
      requireAuth(ctx);
      try {
        const isOwner = await verifyHotelOwnership(ctx!.userId, room.hotelId);
        if (!isOwner) return { ok: false, error: "Not authorized to create rooms for this hotel" };

        const { data, error } = await cFrom("hotel_rooms")
          .insert({
            hotel_id: room.hotelId,
            name: room.name,
            description: room.description,
            capacity: room.capacity,
            adults: room.adults,
            children: room.children,
            bed_type: room.bedType,
            total_units: room.totalUnits,
            base_price_per_night: room.basePricePerNight,
            weekend_price_per_night: room.weekendPricePerNight,
            amenities_json: room.amenitiesJson,
            images_json: room.imagesJson,
            room_size_sqm: room.roomSizeSqm,
            has_balcony: room.hasBalcony,
            has_sea_view: room.hasSeaView,
            has_minibar: room.hasMinibar,
            active: room.active,
            sort_order: room.sortOrder,
          })
          .select()
          .single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: mapRoom(data as DbRoomRow) };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async updateRoom(roomId, updates) {
      requireAuth(ctx);
      const isOwner = await verifyRoomOwnership(ctx!.userId, roomId);
      if (!isOwner) return { ok: false, error: "Not authorized to update this room" };
      try {
        const row: Record<string, unknown> = {};
        if (updates.name !== undefined) row.name = updates.name;
        if (updates.description !== undefined) row.description = updates.description;
        if (updates.capacity !== undefined) row.capacity = updates.capacity;
        if (updates.adults !== undefined) row.adults = updates.adults;
        if (updates.children !== undefined) row.children = updates.children;
        if (updates.bedType !== undefined) row.bed_type = updates.bedType;
        if (updates.totalUnits !== undefined) row.total_units = updates.totalUnits;
        if (updates.basePricePerNight !== undefined) row.base_price_per_night = updates.basePricePerNight;
        if (updates.weekendPricePerNight !== undefined) row.weekend_price_per_night = updates.weekendPricePerNight;
        if (updates.amenitiesJson !== undefined) row.amenities_json = updates.amenitiesJson;
        if (updates.imagesJson !== undefined) row.images_json = updates.imagesJson;
        if (updates.roomSizeSqm !== undefined) row.room_size_sqm = updates.roomSizeSqm;
        if (updates.hasBalcony !== undefined) row.has_balcony = updates.hasBalcony;
        if (updates.hasSeaView !== undefined) row.has_sea_view = updates.hasSeaView;
        if (updates.hasMinibar !== undefined) row.has_minibar = updates.hasMinibar;
        if (updates.active !== undefined) row.active = updates.active;
        if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;

        const { data, error } = await cFrom("hotel_rooms")
          .update(row)
          .eq("id", roomId)
          .select()
          .single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: mapRoom(data as DbRoomRow) };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async deleteRoom(roomId) {
      requireAuth(ctx);
      const isOwner = await verifyRoomOwnership(ctx!.userId, roomId);
      if (!isOwner) return { ok: false, error: "Not authorized to delete this room" };
      try {
        const { count } = await cFrom("hotel_room_availability")
          .select("*", { count: "exact", head: true })
          .eq("room_id", roomId)
          .eq("status", "booked")
          .gte("date", format(new Date(), "yyyy-MM-dd"));

        if (count && count > 0) {
          return { ok: false, error: "Cannot delete room with future bookings" };
        }

        const { error } = await cFrom("hotel_rooms").delete().eq("id", roomId);
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: undefined };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getSeasonalPricing(roomId) {
      try {
        const { data, error } = await cFrom("hotel_seasonal_pricing")
          .select("*")
          .eq("room_id", roomId)
          .order("start_date", { ascending: true });
        if (error) return { ok: false, error: error.message };
        return {
          ok: true,
          data: (data ?? []).map((sp: { id: string; room_id: string; period_name: string; start_date: string; end_date: string; price_per_night: number | string; min_stay_nights: number; created_at: string }) => ({
            id: sp.id,
            roomId: sp.room_id,
            periodName: sp.period_name,
            startDate: sp.start_date,
            endDate: sp.end_date,
            pricePerNight: Number(sp.price_per_night),
            minStayNights: sp.min_stay_nights,
            createdAt: sp.created_at,
          })),
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async upsertSeasonalPricing(pricing) {
      requireAuth(ctx);
      try {
        const { data, error } = await cFrom("hotel_seasonal_pricing")
          .insert({
            room_id: pricing.roomId,
            period_name: pricing.periodName,
            start_date: pricing.startDate,
            end_date: pricing.endDate,
            price_per_night: pricing.pricePerNight,
            min_stay_nights: pricing.minStayNights,
          })
          .select()
          .single();
        if (error) return { ok: false, error: error.message };
        return {
          ok: true,
          data: {
            id: data.id,
            roomId: data.room_id,
            periodName: data.period_name,
            startDate: data.start_date,
            endDate: data.end_date,
            pricePerNight: Number(data.price_per_night),
            minStayNights: data.min_stay_nights,
            createdAt: data.created_at,
          },
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async deleteSeasonalPricing(pricingId) {
      requireAuth(ctx);
      try {
        const { error } = await cFrom("hotel_seasonal_pricing").delete().eq("id", pricingId);
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: undefined };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getPolicy(hotelId) {
      try {
        const { data, error } = await cFrom("hotel_policies")
          .select("*")
          .eq("hotel_id", hotelId)
          .single();
        if (error) return { ok: false, error: error.message };
        return {
          ok: true,
          data: {
            id: data.id,
            hotelId: data.hotel_id,
            checkInTime: data.check_in_time,
            checkOutTime: data.check_out_time,
            cancellationHoursBefore: data.cancellation_hours_before,
            cancellationPenaltyPercent: data.cancellation_penalty_percent,
            lateCancellationPenaltyPercent: data.late_cancellation_penalty_percent,
            childrenPolicy: data.children_policy,
            petPolicy: data.pet_policy,
            wifiCode: data.wifi_code,
            breakfastHours: data.breakfast_hours,
            emergencyPhone: data.emergency_phone,
            floorPlanUrl: data.floor_plan_url,
          },
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async upsertPolicy(policy) {
      requireAuth(ctx);
      try {
        const { data, error } = await cFrom("hotel_policies")
          .upsert({
            hotel_id: policy.hotelId,
            check_in_time: policy.checkInTime,
            check_out_time: policy.checkOutTime,
            cancellation_hours_before: policy.cancellationHoursBefore,
            cancellation_penalty_percent: policy.cancellationPenaltyPercent,
            late_cancellation_penalty_percent: policy.lateCancellationPenaltyPercent,
            children_policy: policy.childrenPolicy,
            pet_policy: policy.petPolicy,
            wifi_code: policy.wifiCode,
            breakfast_hours: policy.breakfastHours,
            emergency_phone: policy.emergencyPhone,
            floor_plan_url: policy.floorPlanUrl,
          }, { onConflict: "hotel_id" })
          .select()
          .single();
        if (error) return { ok: false, error: error.message };
        return {
          ok: true,
          data: {
            id: data.id,
            hotelId: data.hotel_id,
            checkInTime: data.check_in_time,
            checkOutTime: data.check_out_time,
            cancellationHoursBefore: data.cancellation_hours_before,
            cancellationPenaltyPercent: data.cancellation_penalty_percent,
            lateCancellationPenaltyPercent: data.late_cancellation_penalty_percent,
            childrenPolicy: data.children_policy,
            petPolicy: data.pet_policy,
            wifiCode: data.wifi_code,
            breakfastHours: data.breakfast_hours,
            emergencyPhone: data.emergency_phone,
            floorPlanUrl: data.floor_plan_url,
          },
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getCalendar(hotelId, monthStart, monthEnd) {
      requireAuth(ctx);
      try {
        const isOwner = await verifyHotelOwnership(ctx!.userId, hotelId);
        if (!isOwner) return { ok: false, error: "Not authorized to view this calendar" };

        const { data: rooms } = await cFrom("hotel_rooms")
          .select("id")
          .eq("hotel_id", hotelId)
          .eq("active", true);

        const roomIds = rooms?.map((r: { id: string }) => r.id) ?? [];
        if (roomIds.length === 0) return { ok: true, data: [] };

        const { data, error } = await cFrom("hotel_room_availability")
          .select("*")
          .in("room_id", roomIds)
          .gte("date", monthStart)
          .lte("date", monthEnd);

        if (error) return { ok: false, error: error.message };
        return {
          ok: true,
          data: (data ?? []).map((a: { id: string; room_id: string; date: string; status: string; price_override: number | string | null; booking_id: string | null; notes: string | null }) => ({
            id: a.id,
            roomId: a.room_id,
            date: a.date,
            status: a.status as RoomAvailability["status"],
            priceOverride: a.price_override ? Number(a.price_override) : null,
            bookingId: a.booking_id,
            notes: a.notes,
          })),
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getBookingsForProvider(hotelId, status) {
      requireAuth(ctx);
      try {
        const isOwner = await verifyHotelOwnership(ctx!.userId, hotelId);
        if (!isOwner) return { ok: false, error: "Not authorized to view these bookings" };

        let query = cFrom("hotel_bookings")
          .select("*")
          .eq("hotel_id", hotelId)
          .order("created_at", { ascending: false });

        if (status) query = query.eq("status", status);

        const { data, error } = await query;
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: (data ?? []).map((b: DbBookingRow) => mapBooking(b)) };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
