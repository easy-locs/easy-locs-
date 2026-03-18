/**
 * TravelHotels — Hotel search results. Same depth as TravelStays but hotel-specific.
 */
import { useState } from "react";
import { Hotel, SlidersHorizontal, Map, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobilePageHeader from "@/components/mobile/MobilePageHeader";

export default function TravelHotels() {
  const [sortBy, setSortBy] = useState<"price" | "rating" | "stars">("price");

  return (
    <div className="min-h-screen bg-background pb-24">
      <MobilePageHeader title="Hotels" backTo="/travel" />

      <div className="px-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
            <SlidersHorizontal className="h-3 w-3" /> Filters
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 ml-auto">
            <Map className="h-3 w-3" /> Map
          </Button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(["price", "rating", "stars"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                sortBy === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border/30"
              }`}
            >
              {s === "price" ? "Lowest price" : s === "rating" ? "Best rating" : "Star rating"}
            </button>
          ))}
        </div>

        <div className="text-center py-16">
          <Hotel className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">Search hotels</p>
          <p className="text-xs text-muted-foreground mt-1">Find and compare hotels by destination</p>
        </div>
      </div>
    </div>
  );
}
