import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePropertyBooking } from "@/hooks/usePropertyBooking";
import type { PropertyMode, PropertySearchParams } from "@/domains/property/property-booking-types";
import {
import { useUiEngine } from "@/hooks/useUiEngine";
  MapPin, Calendar, Users, Search, Building2, Home,
  Hotel, TreePine, Loader2, X,
} from "lucide-react";

const NAVY = "hsl(225 22% 16%)";
const GOLD = "hsl(var(--accent))";

const SHORT_CATEGORIES = [
  { key: "hotel", label: "Hotels", icon: Hotel },
  { key: "apartment", label: "Apartments", icon: Building2 },
  { key: "villa", label: "Villas", icon: Home },
  { key: "resort", label: "Resorts", icon: TreePine },
];

const LONG_CATEGORIES = [
  { key: "rental_monthly", label: "Monthly Rental", icon: Building2 },
  { key: "purchase", label: "Buy", icon: Home },
];

export default function PropertySearchPage() {
  useUiEngine("property-propertysearchpage");
  const { search, loading, error, clearError } = usePropertyBooking();
  const navigate = useNavigate();

  const [mode, setMode] = useState<PropertyMode>("short_term");
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const categories = mode === "short_term" ? SHORT_CATEGORIES : LONG_CATEGORIES;

  const handleSearch = useCallback(async () => {
    if (!location.trim()) return;
    const params: PropertySearchParams = {
      mode,
      category: selectedCategory as PropertySearchParams["category"],
      location: location.trim(),
      checkIn: mode === "short_term" ? checkIn : undefined,
      checkOut: mode === "short_term" ? checkOut : undefined,
      moveInDate: mode === "long_term" ? moveInDate : undefined,
      guests: { adults, children, infants: 0 },
      rooms: mode === "short_term" ? rooms : undefined,
      currency: "EUR",
      sortBy: "rating",
    };
    await search(params);
  }, [mode, location, checkIn, checkOut, moveInDate, adults, children, rooms, selectedCategory, search]);

  return (
    <div className="app-mobile-page bg-background pb-28">
      <MobilePageHeader title="Find a Place" backTo="/travel" />

      <div className="px-4 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <span className="text-xs text-destructive flex-1">{error}</span>
            <button onClick={clearError}><X className="h-3.5 w-3.5 text-destructive" /></button>
          </div>
        )}

        <div className="flex rounded-xl border border-border/20 overflow-hidden">
          {(["short_term", "long_term"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setSelectedCategory(undefined); }}
              className="flex-1 py-3 text-xs font-bold text-center transition-colors"
              style={{
                background: mode === m ? NAVY : "transparent",
                color: mode === m ? GOLD : "var(--muted-foreground)",
              }}
            >
              {m === "short_term" ? "Short Term" : "Long Term"}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map(cat => {
            const active = selectedCategory === cat.key;
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(active ? undefined : cat.key)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl border shrink-0 transition-colors"
                style={{
                  borderColor: active ? GOLD : "var(--border)",
                  background: active ? `${GOLD}15` : "transparent",
                }}
              >
                <Icon className="h-4 w-4" style={{ color: active ? GOLD : "var(--muted-foreground)" }} />
                <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: active ? GOLD : "var(--foreground)" }}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Where are you going?"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-muted/20 border-border/20"
            />
          </div>

          {mode === "short_term" ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="Check-in"
                  value={checkIn}
                  onChange={e => setCheckIn(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-muted/20 border-border/20 text-xs"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="Check-out"
                  value={checkOut}
                  onChange={e => setCheckOut(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-muted/20 border-border/20 text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Move-in date"
                value={moveInDate}
                onChange={e => setMoveInDate(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-muted/20 border-border/20 text-xs"
              />
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 p-3 rounded-xl border border-border/20 bg-muted/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">Guests</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <span className="text-[10px] text-muted-foreground">Adults</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button onClick={() => setAdults(Math.max(1, adults - 1))} className="w-6 h-6 rounded-full border border-border/30 flex items-center justify-center text-xs">-</button>
                    <span className="text-sm font-bold tabular-nums w-4 text-center">{adults}</span>
                    <button onClick={() => setAdults(Math.min(10, adults + 1))} className="w-6 h-6 rounded-full border border-border/30 flex items-center justify-center text-xs">+</button>
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-muted-foreground">Children</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button onClick={() => setChildren(Math.max(0, children - 1))} className="w-6 h-6 rounded-full border border-border/30 flex items-center justify-center text-xs">-</button>
                    <span className="text-sm font-bold tabular-nums w-4 text-center">{children}</span>
                    <button onClick={() => setChildren(Math.min(8, children + 1))} className="w-6 h-6 rounded-full border border-border/30 flex items-center justify-center text-xs">+</button>
                  </div>
                </div>
              </div>
            </div>

            {mode === "short_term" && (
              <div className="w-24 p-3 rounded-xl border border-border/20 bg-muted/10">
                <div className="flex items-center gap-1 mb-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">Rooms</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <button onClick={() => setRooms(Math.max(1, rooms - 1))} className="w-6 h-6 rounded-full border border-border/30 flex items-center justify-center text-xs">-</button>
                  <span className="text-sm font-bold tabular-nums w-4 text-center">{rooms}</span>
                  <button onClick={() => setRooms(Math.min(10, rooms + 1))} className="w-6 h-6 rounded-full border border-border/30 flex items-center justify-center text-xs">+</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={loading || !location.trim()}
          className="w-full h-12 rounded-xl font-bold text-sm"
          style={{ background: NAVY, color: GOLD }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <><Search className="h-4 w-4 mr-2" /> Search Properties</>
          )}
        </Button>

        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-bold text-foreground">Popular Destinations</h3>
          <div className="grid grid-cols-2 gap-2">
            {["Paris", "Dubai", "London", "New York"].map(city => (
              <button
                key={city}
                onClick={() => setLocation(city)}
                className="p-3 rounded-xl border border-border/15 bg-card/50 text-left"
              >
                <span className="text-xs font-bold text-foreground">{city}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {mode === "short_term" ? "From €60/night" : "From €800/month"}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
