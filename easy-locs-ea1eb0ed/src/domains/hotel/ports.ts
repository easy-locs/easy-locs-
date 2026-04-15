/**
 * Hotel Domain — Port interfaces (hexagonal architecture).
 * Aligned with existing public.hotels / public.hotel_rooms / public.hotel_bookings schema.
 */
import type { DomainResult } from "../shared/types";

export type HotelBookingStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "checked_in"
  | "checked_out"
  | "cancelled_by_guest"
  | "cancelled_by_hotel";

export type RoomAvailabilityStatus = "available" | "booked" | "blocked" | "maintenance";

export interface HotelRoom {
  id: string;
  hotelId: string;
  name: string;
  description: string | null;
  capacity: number;
  adults: number;
  children: number;
  bedType: string;
  totalUnits: number;
  basePricePerNight: number | null;
  weekendPricePerNight: number | null;
  currency: string;
  amenitiesJson: string[];
  imagesJson: string[];
  roomSizeSqm: number | null;
  hasBalcony: boolean;
  hasSeaView: boolean;
  hasMinibar: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface RoomAvailability {
  id: string;
  roomId: string;
  date: string;
  status: RoomAvailabilityStatus;
  priceOverride: number | null;
  bookingId: string | null;
  notes: string | null;
}

export interface SeasonalPricing {
  id: string;
  roomId: string;
  periodName: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
  minStayNights: number;
  createdAt: string;
}

export interface HotelPolicy {
  id: string;
  hotelId: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationHoursBefore: number;
  cancellationPenaltyPercent: number;
  lateCancellationPenaltyPercent: number;
  childrenPolicy: string | null;
  petPolicy: string | null;
  wifiCode: string | null;
  breakfastHours: string | null;
  emergencyPhone: string | null;
  floorPlanUrl: string | null;
}

export interface HotelBooking {
  id: string;
  userId: string;
  hotelId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalPrice: number;
  currency: string;
  status: HotelBookingStatus;
  bookingReference: string;
  guestName: string | null;
  guestEmail: string | null;
  createdAt: string;
}

export interface AvailabilityResult {
  available: boolean;
  pricePerNight: number;
  totalPrice: number;
  nights: number;
  appliedSeasonalPricing: string | null;
}

export interface DashboardData {
  occupiedRooms: number;
  totalRooms: number;
  occupancyPercent: number;
  arrivalsToday: HotelBooking[];
  departuresToday: HotelBooking[];
  pendingBookings: HotelBooking[];
  monthRevenue: number;
  currency: string;
}

export interface CancellationResult {
  refundAmount: number;
  penaltyPercent: number;
  refundedToWallet: boolean;
}

export interface CheckInInfo {
  roomNumber: string | null;
  wifiCode: string | null;
  breakfastHours: string | null;
  emergencyPhone: string | null;
  floorPlanUrl: string | null;
  checkOutTime: string;
}

export interface HotelUseCases {
  getOwnedHotelId(): Promise<DomainResult<string>>;

  checkAvailability(
    hotelId: string,
    roomTypeId: string,
    checkIn: string,
    checkOut: string,
    guestCount: number,
    ratePlanId?: string
  ): Promise<DomainResult<AvailabilityResult>>;

  createBooking(cmd: {
    hotelId: string;
    roomTypeId: string;
    ratePlanId?: string;
    checkIn: string;
    checkOut: string;
    guestInfo: { name: string; email: string };
    adults: number;
    children: number;
  }): Promise<DomainResult<HotelBooking>>;

  confirmBooking(bookingId: string): Promise<DomainResult<HotelBooking>>;
  rejectBooking(bookingId: string, reason: string): Promise<DomainResult<HotelBooking>>;
  cancelBooking(bookingId: string, cancelledBy: "guest" | "hotel"): Promise<DomainResult<CancellationResult>>;
  checkInGuest(bookingId: string, roomNumber?: string): Promise<DomainResult<CheckInInfo>>;
  checkOutGuest(bookingId: string): Promise<DomainResult<HotelBooking>>;

  getHotelDashboard(hotelId: string): Promise<DomainResult<DashboardData>>;

  blockDates(roomTypeId: string, dates: string[], reason?: string): Promise<DomainResult<void>>;
  unblockDates(roomTypeId: string, dates: string[]): Promise<DomainResult<void>>;

  getRooms(hotelId: string): Promise<DomainResult<HotelRoom[]>>;
  createRoom(room: Omit<HotelRoom, "id" | "createdAt">): Promise<DomainResult<HotelRoom>>;
  updateRoom(roomId: string, updates: Partial<HotelRoom>): Promise<DomainResult<HotelRoom>>;
  deleteRoom(roomId: string): Promise<DomainResult<void>>;

  getSeasonalPricing(roomId: string): Promise<DomainResult<SeasonalPricing[]>>;
  upsertSeasonalPricing(pricing: Omit<SeasonalPricing, "id" | "createdAt">): Promise<DomainResult<SeasonalPricing>>;
  deleteSeasonalPricing(pricingId: string): Promise<DomainResult<void>>;

  getPolicy(hotelId: string): Promise<DomainResult<HotelPolicy>>;
  upsertPolicy(policy: Omit<HotelPolicy, "id">): Promise<DomainResult<HotelPolicy>>;

  getCalendar(hotelId: string, monthStart: string, monthEnd: string): Promise<DomainResult<RoomAvailability[]>>;
  getBookingsForProvider(hotelId: string, status?: HotelBookingStatus): Promise<DomainResult<HotelBooking[]>>;
}

export interface HotelEventPort {
  bookingCreated(booking: HotelBooking, hotelId: string): void;
  bookingConfirmed(booking: HotelBooking): void;
  bookingRejected(booking: HotelBooking, reason: string): void;
  bookingCancelled(booking: HotelBooking, cancelledBy: "guest" | "hotel", penaltyPercent: number): void;
  guestCheckedIn(booking: HotelBooking, info: CheckInInfo): void;
  guestCheckedOut(booking: HotelBooking): void;
}
