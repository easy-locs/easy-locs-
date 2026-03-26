/**
 * TravelStays — Short-term stays / seasonal rental search.
 * Booking.com-depth: filters, map, amenities, cancellation policy.
 */
import { useState } from "react";
import { Home, SlidersHorizontal, Map, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";

export interface StaySearchParams {
  country?: string;
  city?: string;
  area?: string;
  destinationName?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  rooms?: number;
  guests: { adults: number; children: number };
  propertyType?: string[];
  priceMin?: number;
  priceMax?: number;
  minRating?: number;
  amenities?: string[];
  cancellationPolicy?: "free" | "flexible" | "any";
  breakfastIncluded?: boolean;
  paymentTiming?: "pay_now" | "pay_later" | "any";
  sortBy?: "price" | "rating" | "distance" | "reviews";
}

export interface StayResult {
  id: string;
  title: string;
  photoUrl?: string;
  photoUrls?: string[];
  city: string;
  area?: string;
  lat?: number;
  lng?: number;
  propertyType: string;
  pricePerNight: number;
  currency: string;
  rating?: number;
  reviewScore?: number;
  reviewCount?: number;
  amenities?: string[];
  cancellationPolicy?: string;
  breakfastIncluded?: boolean;
  hostName?: string;
  checkInTime?: string;
  checkOutTime?: string;
  roomOptions?: { name: string; price: number; maxGuests: number }[];
  taxesAndFees?: number;
}

export default function TravelStays() {
  const [sortBy, setSortBy] = useState<"price" | "rating" | "reviews">("price");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const results: StayResult[] = [];

  return (
    <div className="app-mobile-page bg-background pb-24">
      <MobilePageHeader title="Stays" backTo="/travel" />

      <div className="px-4 space-y-3">
        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
            <SlidersHorizontal className="h-3 w-3" /> Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1 ml-auto"
            onClick={() => setViewMode(v => v === "list" ? "map" : "list")}
          >
            <Map className="h-3 w-3" /> {viewMode === "list" ? "Map" : "List"}
          </Button>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(["price", "rating", "reviews"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                sortBy === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border/30"
              }`}
            >
              {s === "price" ? "Lowest price" : s === "rating" ? "Top rated" : "Most reviewed"}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {results.length === 0 && (
          <div className="text-center py-16">
            <Home className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">Find your perfect stay</p>
            <p className="text-xs text-muted-foreground mt-1">Search by destination, dates, and guests</p>
          </div>
        )}
      </div>
    </div>
  );
}
