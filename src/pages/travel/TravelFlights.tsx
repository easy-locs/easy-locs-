/**
 * TravelFlights — Flight search results page.
 * Full Booking.com-depth search with filters.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, ArrowLeftRight, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";

export interface FlightSearchParams {
  originCountry?: string;
  originCity?: string;
  originAirport?: string;
  destCountry?: string;
  destCity?: string;
  destAirport?: string;
  departDate?: string;
  returnDate?: string;
  tripType: "one_way" | "round_trip";
  passengers: { adults: number; children: number; infants: number };
  cabinClass: "economy" | "premium_economy" | "business" | "first";
  directOnly?: boolean;
  flexibleDates?: boolean;
  airline?: string;
}

export interface FlightResult {
  id: string;
  airline: string;
  airlineLogo?: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  stops: number;
  stopCities?: string[];
  price: number;
  currency: string;
  fareFamily?: string;
  baggageIncluded?: string;
  refundable?: boolean;
}

export default function TravelFlights() {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<"price" | "duration" | "departure">("price");

  // Placeholder results for structure
  const results: FlightResult[] = [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <MobilePageHeader title="Flights" backTo="/travel" />
      
      <div className="px-4 space-y-3">
        {/* Search summary bar */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <Plane className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-foreground flex-1">Search for flights above</p>
          <Button variant="outline" size="sm" className="h-7 text-[10px]">
            <SlidersHorizontal className="h-3 w-3 mr-1" /> Filters
          </Button>
        </div>

        {/* Sort bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(["price", "duration", "departure"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                sortBy === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border/30"
              }`}
            >
              {s === "price" ? "Cheapest" : s === "duration" ? "Fastest" : "Earliest"}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {results.length === 0 && (
          <div className="text-center py-16">
            <Plane className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">Search for flights</p>
            <p className="text-xs text-muted-foreground mt-1">Enter your origin, destination, and dates to find flights</p>
          </div>
        )}
      </div>
    </div>
  );
}
