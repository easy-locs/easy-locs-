/**
 * RideSearchPage — /ride/search — Careem-style destination search with pickup/dropoff, filter chips, and place results.
 */
import { useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin, Navigation, Building2, Plane, ShoppingBag, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSmartLocation, type SavedPlace } from "@/hooks/useSmartLocation";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import { calculateFare, getFareRules, isNightHour, type FareEstimate } from "@/lib/fare-engine";
import DriverMatchingState, { type MatchState } from "@/components/ride/DriverMatchingState";
import RideMap from "@/components/ride/RideMap";
import SEOHead from "@/components/SEOHead";

import rideEconomy from "@/assets/ride-economy.png";
import rideComfort from "@/assets/ride-comfort.png";
import rideXl from "@/assets/ride-xl.png";
import rideBike from "@/assets/ride-bike.png";

const DUBAI_CENTER = { lat: 25.2048, lng: 55.2708 };

type FilterChip = "suggested" | "saved" | "airports" | "malls";

type Step = "search" | "vehicle" | "matching";

const VEHICLE_TYPES = [
  { id: "economy", label: "Economy", desc: "4 seats", eta: "4 min", multiplier: 1, image: rideEconomy },
  { id: "comfort", label: "Comfort", desc: "4 seats", eta: "6 min", multiplier: 1.4, image: rideComfort },
  { id: "xl", label: "XL", desc: "6 seats", eta: "8 min", multiplier: 1.8, image: rideXl },
  { id: "bike", label: "Bike", desc: "1 seat", eta: "2 min", multiplier: 0.7, image: rideBike },
];

function haversine(a: { lat?: number; lng?: number }, b: { lat?: number; lng?: number }): { km: number; min: number } {
  if (!a.lat || !b.lat || !a.lng || !b.lng) return { km: 0, min: 0 };
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return { km: Math.max(km, 1.5), min: Math.max(Math.round(km * 2.5), 5) };
}

function distanceLabel(userLat: number, userLng: number, place: SavedPlace): string {
  if (!place.lat || !place.lng) return "";
  const { km } = haversine({ lat: userLat, lng: userLng }, { lat: place.lat, lng: place.lng });
  return `${km.toFixed(1)} km`;
}

export default function RideSearchPage() {
  const navigate = useNavigate();
  const locationState = useLocation().state as any;
  const { geo, currentLocation, places, addRecent } = useSmartLocation();
  const { country: detectedCountry } = useGeoDetect();

  const userLat = geo.lat || DUBAI_CENTER.lat;
  const userLng = geo.lng || DUBAI_CENTER.lng;

  const hasPrefilledDropoff = !!(locationState?.dropoffLat);
  const [step, setStep] = useState<Step>(hasPrefilledDropoff ? "vehicle" : "search");
  const [pickupLabel, setPickupLabel] = useState(currentLocation?.address || "Current Location");
  const [pickup, setPickup] = useState<SavedPlace | null>(currentLocation || {
    id: "current", label: "Current Location", type: "recent", address: "Current Location",
    lat: userLat, lng: userLng, icon: "📍"
  });
  const [dropoffLabel, setDropoffLabel] = useState(locationState?.dropoffLabel || "");
  const [dropoff, setDropoff] = useState<SavedPlace | null>(
    locationState?.dropoffLat ? {
      id: "nav", label: locationState.dropoffLabel, type: "recent",
      address: locationState.dropoffLabel, lat: locationState.dropoffLat, lng: locationState.dropoffLng, icon: "📍"
    } : null
  );
  const [activeField, setActiveField] = useState<"pickup" | "dropoff">("dropoff");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterChip>("suggested");
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLE_TYPES[0]);
  const [matchState, setMatchState] = useState<MatchState>("searching");


  const rules = useMemo(() => getFareRules(detectedCountry), [detectedCountry]);
  const night = useMemo(() => isNightHour(), []);
  const { km, min } = useMemo(() => haversine(
    { lat: pickup?.lat, lng: pickup?.lng },
    { lat: dropoff?.lat, lng: dropoff?.lng }
  ), [pickup, dropoff]);

  const fareForVehicle = useCallback((multiplier: number) => {
    if (!km) return "—";
    const est = calculateFare({ distanceKm: km * multiplier, durationMin: min, rules, isNight: night });
    return `${est.total.toFixed(0)} ${est.currency}`;
  }, [km, min, rules, night]);

  const fareEstimate = useMemo((): FareEstimate | null => {
    if (!km) return null;
    return calculateFare({ distanceKm: km * selectedVehicle.multiplier, durationMin: min, rules, isNight: night });
  }, [km, min, selectedVehicle, rules, night]);

  // Filter places
  const filteredPlaces = useMemo(() => {
    let list = places.filter(p => p.address);
    if (filter === "saved") list = list.filter(p => p.type === "home" || p.type === "work" || p.type === "favorite");
    if (filter === "airports") list = list.filter(p => p.address?.toLowerCase().includes("airport"));
    if (filter === "malls") list = list.filter(p => p.address?.toLowerCase().includes("mall"));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.label.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q));
    }
    return list.slice(0, 8);
  }, [places, filter, searchQuery]);

  const selectPlace = (place: SavedPlace) => {
    if (activeField === "pickup") {
      setPickup(place);
      setPickupLabel(place.label);
      setActiveField("dropoff");
    } else {
      setDropoff(place);
      setDropoffLabel(place.label);
      if (place.address) addRecent(place.address, place.city, place.lat, place.lng);
      setStep("vehicle");
    }
  };

  const confirmRide = () => {
    setStep("matching");
    setMatchState("searching");
  };

  // Search step
  if (step === "search") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead title="Where to?" description="Search your destination" />

        {/* Header */}
        <div className="sticky top-0 z-30 bg-background border-b border-border/10">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center active:scale-90 transition-transform">
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                {" · For me"}
              </p>
            </div>
            <div className="w-9" />
          </div>
        </div>

        {/* Pickup / Dropoff inputs */}
        <div className="px-4 pt-3 pb-2">
          <div className="rounded-2xl border border-border/20 bg-card p-3 space-y-0">
            {/* Pickup */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Navigation className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <input
                value={pickupLabel}
                onChange={(e) => { setPickupLabel(e.target.value); setSearchQuery(e.target.value); }}
                onFocus={() => setActiveField("pickup")}
                placeholder="Your location"
                className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none py-2"
              />
            </div>

            <div className="ml-4 border-l border-dashed border-border/30 h-3" />

            {/* Dropoff */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <MapPin className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
              <input
                value={dropoffLabel}
                onChange={(e) => { setDropoffLabel(e.target.value); setSearchQuery(e.target.value); }}
                onFocus={() => setActiveField("dropoff")}
                placeholder="Enter your destination"
                autoFocus
                className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none py-2"
              />
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
          {(["suggested", "saved", "airports", "malls"] as FilterChip[]).map(chip => (
            <button
              key={chip}
              onClick={() => setFilter(chip)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                filter === chip
                  ? "bg-foreground text-background"
                  : "bg-muted/30 text-foreground border border-border/20"
              }`}
            >
              {chip.charAt(0).toUpperCase() + chip.slice(1)}
            </button>
          ))}
        </div>

        {/* Place results */}
        <div className="flex-1 px-4 py-2">
          {filteredPlaces.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No places found</p>
            </div>
          )}
          {filteredPlaces.map(place => (
            <button
              key={place.id}
              onClick={() => selectPlace(place)}
              className="w-full flex items-center gap-3 py-3.5 border-b border-border/10 last:border-0 active:bg-muted/10 transition-colors"
            >
              <div className="flex flex-col items-center shrink-0 w-12">
                <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center">
                  {place.type === "home" ? <Building2 className="h-4 w-4 text-primary" /> :
                   place.type === "work" ? <Building2 className="h-4 w-4 text-accent-foreground" /> :
                   <MapPin className="h-4 w-4 text-muted-foreground" />}
                </div>
                <span className="text-[9px] text-muted-foreground mt-0.5">
                  {distanceLabel(userLat, userLng, place)}
                </span>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{place.label}</p>
                <p className="text-xs text-muted-foreground truncate">{place.address}</p>
              </div>
              <MoreVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Vehicle selection step
  if (step === "vehicle") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead title="Choose your ride" description="Select vehicle type" />

        {/* Map */}
        <div className="relative h-[35vh] min-h-[200px]">
          <div className="absolute top-4 left-4 z-20">
            <button onClick={() => setStep("search")} className="w-10 h-10 rounded-xl bg-card/90 backdrop-blur-md border border-border/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
              <ArrowLeft className="h-4.5 w-4.5 text-foreground" />
            </button>
          </div>
          <RideMap
            pickup={pickup}
            dropoff={dropoff}
            userLat={userLat}
            userLng={userLng}
            drivers={[]}
            className="h-full w-full !rounded-none !border-0"
          />
        </div>

        {/* Route summary */}
        <div className="px-4 py-3 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <div className="w-0.5 h-6 bg-border/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-accent" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xs text-foreground font-medium truncate">{pickup?.label || pickupLabel}</p>
              <p className="text-xs text-foreground font-medium truncate">{dropoff?.label || dropoffLabel}</p>
            </div>
            {km > 0 && (
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-foreground">{km.toFixed(1)} km</p>
                <p className="text-[10px] text-muted-foreground">{min} min</p>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle list */}
        <div className="flex-1 px-4 py-3 space-y-2 overflow-y-auto">
          {VEHICLE_TYPES.map(v => (
            <motion.button
              key={v.id}
              onClick={() => setSelectedVehicle(v)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-[0.98] ${
                selectedVehicle.id === v.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/15 bg-card hover:bg-muted/20"
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-16 h-12 flex items-center justify-center shrink-0">
                <img src={v.image} alt={v.label} className="h-10 w-auto object-contain" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{v.label}</p>
                  <span className="text-[10px] text-muted-foreground">{v.desc}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-emerald-600">{v.eta}</span>
                </div>
              </div>
              <p className="text-sm font-bold text-foreground shrink-0">{fareForVehicle(v.multiplier)}</p>
            </motion.button>
          ))}
        </div>

        {/* Confirm CTA */}
        <div className="px-4 py-4 border-t border-border/10 bg-background">
          <button
            onClick={confirmRide}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
          >
            Confirm {selectedVehicle.label} · {fareForVehicle(selectedVehicle.multiplier)}
          </button>
        </div>
      </div>
    );
  }

  // Matching step
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title="Finding driver" description="Matching you with a nearby driver" />

      <div className="relative h-[40vh] min-h-[220px]">
        <div className="absolute top-4 left-4 z-20">
          <button onClick={() => setStep("vehicle")} className="w-10 h-10 rounded-xl bg-card/90 backdrop-blur-md border border-border/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
            <ArrowLeft className="h-4.5 w-4.5 text-foreground" />
          </button>
        </div>
        <RideMap
          pickup={pickup}
          dropoff={dropoff}
          userLat={userLat}
          userLng={userLng}
          drivers={[]}
          className="h-full w-full !rounded-none !border-0"
        />
      </div>

      <div className="flex-1 px-4 py-4">
        <DriverMatchingState
          state={matchState}
          onStateChange={setMatchState}
          fareTotal={fareEstimate?.total}
          fareCurrency={fareEstimate?.currency}
          pickupLabel={pickup?.label || pickupLabel}
          dropoffLabel={dropoff?.label || dropoffLabel}
          distanceLabel={km ? `${km.toFixed(1)} km` : undefined}
          durationLabel={min ? `${min} min` : undefined}
        />
      </div>
    </div>
  );
}
