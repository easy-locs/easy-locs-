import type { CurrencyCode } from "@/domains/shared/canonical-types";

export type PropertyMode = "short_term" | "long_term";

export type ShortTermCategory = "hotel" | "apartment" | "villa" | "resort" | "serviced_apartment";
export type LongTermCategory = "rental_monthly" | "purchase" | "managed_property";

export type PropertyBookingStatus =
  | "searching"
  | "selected"
  | "booking_pending"
  | "payment_pending"
  | "payment_confirmed"
  | "confirmed"
  | "cancelled"
  | "refund_pending"
  | "refunded"
  | "failed";

export interface PropertySearchParams {
  mode: PropertyMode;
  category?: ShortTermCategory | LongTermCategory;
  location: string;
  country?: string;
  checkIn?: string;
  checkOut?: string;
  moveInDate?: string;
  guests: GuestCount;
  rooms?: number;
  minPrice?: number;
  maxPrice?: number;
  currency: CurrencyCode;
  amenities?: string[];
  propertyType?: string;
  furnished?: boolean;
  petFriendly?: boolean;
  instantBook?: boolean;
  sortBy?: "price" | "rating" | "distance" | "reviews" | "newest";
}

export interface GuestCount {
  adults: number;
  children: number;
  infants: number;
}

export interface PropertyPhoto {
  id: string;
  url: string;
  caption?: string;
  order: number;
}

export interface PropertyAmenity {
  key: string;
  label: string;
  category: "essential" | "comfort" | "safety" | "outdoor" | "kitchen" | "entertainment";
  available: boolean;
}

export interface PropertyHost {
  id: string;
  name: string;
  avatar?: string;
  superhost: boolean;
  responseRate: number;
  responseTime: string;
  joinedDate: string;
  reviewCount: number;
  rating: number;
  verified: boolean;
}

export interface PropertyReview {
  id: string;
  userId: string;
  userName: string;
  avatar?: string;
  rating: number;
  comment: string;
  date: string;
  stayDate?: string;
}

export interface PriceBreakdown {
  basePrice: number;
  nights?: number;
  pricePerNight?: number;
  pricePerMonth?: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  deposit?: number;
  totalPrice: number;
  currency: CurrencyCode;
}

export interface AvailabilitySlot {
  date: string;
  available: boolean;
  price?: number;
  minStay?: number;
}

export interface PropertyListing {
  id: string;
  title: string;
  description: string;
  mode: PropertyMode;
  category: ShortTermCategory | LongTermCategory;
  propertyType: string;
  location: {
    address: string;
    city: string;
    country: string;
    lat?: number;
    lng?: number;
  };
  photos: PropertyPhoto[];
  coverImage: string;
  amenities: PropertyAmenity[];
  host: PropertyHost;
  rating: number;
  reviewCount: number;
  reviews: PropertyReview[];
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  area?: number;
  areaUnit?: "sqm" | "sqft";
  furnished?: boolean;
  petFriendly: boolean;
  instantBook: boolean;
  pricing: PriceBreakdown;
  availability: AvailabilitySlot[];
  rules: string[];
  cancellationPolicy: "flexible" | "moderate" | "strict" | "non_refundable";
  checkInTime?: string;
  checkOutTime?: string;
  highlights: string[];
}

export interface PropertyBookingGuest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests?: string;
}

export interface PropertyBooking {
  bookingId: string;
  bookingRef: string;
  userId: string;
  propertyId: string;
  propertyTitle: string;
  propertyCoverImage: string;
  mode: PropertyMode;
  status: PropertyBookingStatus;
  checkIn?: string;
  checkOut?: string;
  moveInDate?: string;
  guests: GuestCount;
  mainGuest: PropertyBookingGuest;
  pricing: PriceBreakdown;
  hostId: string;
  hostName: string;
  cancellationPolicy: string;
  paymentMethod?: string;
  paymentRef?: string;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
}
