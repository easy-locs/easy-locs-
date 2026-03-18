/**
 * Travel data model types — Booking.com-depth search & detail structures.
 * Ready for external API integration (Demand API, etc.).
 */

/* ═══ Flight Search ═══ */
export interface FlightSearchQuery {
  originCountry?: string;
  originCity?: string;
  originAirport?: string;
  destCountry?: string;
  destCity?: string;
  destAirport?: string;
  departDate: string;
  returnDate?: string;
  tripType: "one_way" | "round_trip";
  passengers: { adults: number; children: number; infants: number };
  cabinClass: "economy" | "premium_economy" | "business" | "first";
  directOnly?: boolean;
  flexibleDates?: boolean;
  preferredAirline?: string;
  departureTimeRange?: { from: string; to: string };
  arrivalTimeRange?: { from: string; to: string };
  sortBy?: "price" | "duration" | "departure" | "arrival";
}

export interface FlightSegment {
  departureAirport: string;
  departureCity: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalCity: string;
  arrivalTime: string;
  airline: string;
  flightNumber: string;
  aircraft?: string;
  durationMinutes: number;
  cabinClass: string;
}

export interface FlightOffer {
  id: string;
  segments: FlightSegment[];
  totalDurationMinutes: number;
  stops: number;
  stopCities?: string[];
  price: number;
  currency: string;
  fareFamily?: string;
  baggagePolicy: {
    cabinBag: { count: number; weightKg: number };
    checkedBag: { count: number; weightKg: number };
    extraBagPrice?: number;
  };
  refundable: boolean;
  changePolicy?: string;
  seatsRemaining?: number;
}

/* ═══ Stay / Hotel Search ═══ */
export interface StaySearchQuery {
  country?: string;
  city?: string;
  area?: string;
  destinationName?: string;
  checkIn: string;
  checkOut: string;
  nights?: number;
  rooms: number;
  guests: { adults: number; children: number };
  propertyType?: string[];
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  minRating?: number;
  minReviewScore?: number;
  amenities?: string[];
  cancellationPolicy?: "free" | "flexible" | "any";
  breakfastIncluded?: boolean;
  paymentTiming?: "pay_now" | "pay_later" | "any";
  sortBy?: "price" | "rating" | "distance" | "reviews" | "popularity";
  mapBounds?: { neLat: number; neLng: number; swLat: number; swLng: number };
}

export interface RoomOption {
  id: string;
  name: string;
  maxGuests: number;
  bedType?: string;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  breakfastIncluded?: boolean;
  cancellationDeadline?: string;
  refundable?: boolean;
  availableRooms?: number;
}

export interface StayOffer {
  id: string;
  title: string;
  propertyType: string;
  photoUrl?: string;
  photoUrls?: string[];
  city: string;
  area?: string;
  country?: string;
  lat?: number;
  lng?: number;
  starRating?: number;
  guestRating?: number;
  reviewScore?: number;
  reviewCount?: number;
  rooms: RoomOption[];
  lowestPrice: number;
  currency: string;
  amenities: string[];
  cancellationPolicy?: string;
  breakfastIncluded?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  hostInfo?: {
    name: string;
    responseRate?: number;
    isSuperhost?: boolean;
    joinedYear?: number;
  };
  taxesAndFees?: number;
  houseRules?: string[];
}

/* ═══ Booking Flow ═══ */
export interface TravelBooking {
  id: string;
  type: "flight" | "hotel" | "stay";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  offerId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  totalPrice: number;
  currency: string;
  paymentStatus: "pending" | "paid" | "refunded";
  checkIn?: string;
  checkOut?: string;
  departDate?: string;
  returnDate?: string;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
}
