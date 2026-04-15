/**
 * Hotel Domain — Event adapter (outbound port implementation).
 */
import { publishDomainEvent, createDomainEvent } from "../shared/domain-event-bus";
import type { HotelEventPort, HotelBooking, CheckInInfo } from "./ports";

export const hotelEvents: HotelEventPort = {
  bookingCreated(booking: HotelBooking, hotelId: string) {
    publishDomainEvent(
      createDomainEvent("hotel:booking_created", booking.id, "hotel_booking", {
        bookingId: booking.id,
        userId: booking.userId,
        hotelId,
        roomTypeId: booking.roomTypeId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalPrice: booking.totalPrice,
        currency: booking.currency,
        bookingReference: booking.bookingReference,
        guestName: booking.guestName,
      }, "hotel")
    );
  },

  bookingConfirmed(booking: HotelBooking) {
    publishDomainEvent(
      createDomainEvent("hotel:booking_confirmed", booking.id, "hotel_booking", {
        bookingId: booking.id,
        userId: booking.userId,
        hotelId: booking.hotelId,
        bookingReference: booking.bookingReference,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalPrice: booking.totalPrice,
        currency: booking.currency,
      }, "hotel")
    );
  },

  bookingRejected(booking: HotelBooking, reason: string) {
    publishDomainEvent(
      createDomainEvent("hotel:booking_rejected", booking.id, "hotel_booking", {
        bookingId: booking.id,
        userId: booking.userId,
        hotelId: booking.hotelId,
        bookingReference: booking.bookingReference,
        reason,
        totalPrice: booking.totalPrice,
        currency: booking.currency,
      }, "hotel")
    );
  },

  bookingCancelled(booking: HotelBooking, cancelledBy: "guest" | "hotel", penaltyPercent: number) {
    publishDomainEvent(
      createDomainEvent("hotel:booking_cancelled", booking.id, "hotel_booking", {
        bookingId: booking.id,
        userId: booking.userId,
        hotelId: booking.hotelId,
        cancelledBy,
        penaltyPercent,
        totalPrice: booking.totalPrice,
        currency: booking.currency,
      }, "hotel")
    );
  },

  guestCheckedIn(booking: HotelBooking, info: CheckInInfo) {
    publishDomainEvent(
      createDomainEvent("hotel:guest_checked_in", booking.id, "hotel_booking", {
        bookingId: booking.id,
        userId: booking.userId,
        hotelId: booking.hotelId,
        bookingReference: booking.bookingReference,
        roomNumber: info.roomNumber,
        wifiCode: info.wifiCode,
        breakfastHours: info.breakfastHours,
        emergencyPhone: info.emergencyPhone,
        checkOutTime: info.checkOutTime,
        floorPlanUrl: info.floorPlanUrl,
      }, "hotel")
    );
  },

  guestCheckedOut(booking: HotelBooking) {
    publishDomainEvent(
      createDomainEvent("hotel:guest_checked_out", booking.id, "hotel_booking", {
        bookingId: booking.id,
        userId: booking.userId,
        hotelId: booking.hotelId,
        bookingReference: booking.bookingReference,
      }, "hotel")
    );
  },
};
