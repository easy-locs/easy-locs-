import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SubPageShell from "@/components/layout/SubPageShell";
import { Button } from "@/components/ui/button";
import { usePropertyBooking } from "@/hooks/usePropertyBooking";
import type { PropertyListing } from "@/domains/property/property-booking-types";
import { useUiEngine } from "@/hooks/useUiEngine";
import {
  Star, MapPin, Wifi, Car, Waves, BedDouble, Bath,
  SlidersHorizontal, ChevronDown, Heart, Zap, Users,
} from "lucide-react";

const NAVY = "hsl(225 22% 16%)";
const GOLD = "hsl(var(--accent))";

type SortKey = "rating" | "price_low" | "price_high" | "reviews";

function PropertyCard({ listing, onSelect }: { listing: PropertyListing; onSelect: () => void }) {
  const isShort = listing.mode === "short_term";
  const priceLabel = isShort
    ? `€${listing.pricing.pricePerNight ?? listing.pricing.basePrice}/night`
    : `€${listing.pricing.pricePerMonth ?? listing.pricing.basePrice}/month`;

  return (
    <button onClick={onSelect} className="w-full text-left rounded-2xl border border-border/15 bg-card/50 overflow-hidden">
      <div className="h-40 bg-muted/20 relative flex items-center justify-center">
        <span className="text-muted-foreground/20 text-xs">Photo</span>
        {listing.instantBook && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: GOLD, color: NAVY }}>
            <Zap className="h-3 w-3" /> Instant
          </div>
        )}
        {listing.host.superhost && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-foreground/80 text-background text-[10px] font-bold">
            Superhost
          </div>
        )}
        <button
          onClick={e => e.stopPropagation()}
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center"
        >
          <Heart className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground line-clamp-1">{listing.title}</h3>
          <div className="flex items-center gap-0.5 shrink-0">
            <Star className="h-3 w-3 fill-warning text-warning" />
            <span className="text-xs font-semibold tabular-nums">{listing.rating.toFixed(1)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{listing.location.city}, {listing.location.country}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><BedDouble className="h-3 w-3" /> {listing.bedrooms}</span>
          <span className="flex items-center gap-0.5"><Bath className="h-3 w-3" /> {listing.bathrooms}</span>
          <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {listing.maxGuests}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {listing.amenities.filter(a => a.available).slice(0, 3).map(a => (
            <span key={a.key} className="px-1.5 py-0.5 rounded bg-muted/30 text-[10px] text-muted-foreground">{a.label}</span>
          ))}
        </div>
        <div className="flex items-end justify-between pt-1">
          <div>
            <span className="text-sm font-extrabold tabular-nums text-foreground">{priceLabel}</span>
            {isShort && listing.pricing.totalPrice > 0 && (
              <p className="text-[10px] text-muted-foreground">€{listing.pricing.totalPrice} total</p>
            )}
          </div>
          <span className="text-[10px] font-medium capitalize" style={{ color: GOLD }}>
            {listing.cancellationPolicy} cancel
          </span>
        </div>
      </div>
    </button>
  );
}

export default function PropertyResultsPage() {
  useUiEngine("property-results");
  const navigate = useNavigate();
  const { listings, searchParams, selectListing, loading } = usePropertyBooking();
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [showSort, setShowSort] = useState(false);

  const sorted = useMemo(() => {
    const items = [...listings];
    switch (sortBy) {
      case "rating": return items.sort((a, b) => b.rating - a.rating);
      case "price_low": return items.sort((a, b) => a.pricing.totalPrice - b.pricing.totalPrice);
      case "price_high": return items.sort((a, b) => b.pricing.totalPrice - a.pricing.totalPrice);
      case "reviews": return items.sort((a, b) => b.reviewCount - a.reviewCount);
      default: return items;
    }
  }, [listings, sortBy]);

  useEffect(() => {
    if (!searchParams) navigate("/property/search", { replace: true });
  }, [searchParams, navigate]);

  if (!searchParams) {
    return (
      <SubPageShell noContentPad className="flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </SubPageShell>
    );
  }

  const sortLabels: Record<SortKey, string> = {
    rating: "Top Rated",
    price_low: "Price: Low to High",
    price_high: "Price: High to Low",
    reviews: "Most Reviews",
  };

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader
        title={`${searchParams.location || "Properties"}`}
        backTo="/property/search"
      />

      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground tabular-nums">{listings.length}</span> properties found
          </p>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={() => setShowSort(!showSort)}
            >
              <SlidersHorizontal className="h-3 w-3" />
              {sortLabels[sortBy]}
              <ChevronDown className="h-3 w-3" />
            </Button>
            {showSort && (
              <div className="absolute right-0 top-8 z-20 bg-card border border-border/20 rounded-xl shadow-lg py-1 min-w-[160px]">
                {(Object.keys(sortLabels) as SortKey[]).map(key => (
                  <button
                    key={key}
                    onClick={() => { setSortBy(key); setShowSort(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted/20 transition-colors"
                    style={{ fontWeight: sortBy === key ? 700 : 400, color: sortBy === key ? GOLD : undefined }}
                  >
                    {sortLabels[key]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="px-2 py-1 rounded-lg bg-muted/20 font-medium" style={{ color: GOLD }}>
            {searchParams.mode === "short_term" ? "Short Term" : "Long Term"}
          </span>
          {searchParams.checkIn && searchParams.checkOut && (
            <span className="px-2 py-1 rounded-lg bg-muted/20">
              {searchParams.checkIn} → {searchParams.checkOut}
            </span>
          )}
          <span className="px-2 py-1 rounded-lg bg-muted/20">
            {searchParams.guests.adults + searchParams.guests.children} guests
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${GOLD} transparent ${GOLD} ${GOLD}` }} />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-bold text-foreground mb-1">No properties found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(listing => (
              <PropertyCard
                key={listing.id}
                listing={listing}
                onSelect={() => selectListing(listing)}
              />
            ))}
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
