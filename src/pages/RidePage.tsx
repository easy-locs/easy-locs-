/**
 * RidePage — /ride — Full taxi universe.
 * Map-first → Pickup → Destination → Fare → Confirm → Driver match → Track.
 */
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Car, Shield, Star, Zap, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import SmartLocationPicker from "@/components/location/SmartLocationPicker";
import { useSmartLocation, type SavedPlace } from "@/hooks/useSmartLocation";
import RideMap from "@/components/ride/RideMap";
import RideTypeSelector, { RIDE_TYPES, type RideType } from "@/components/ride/RideTypeSelector";
import DriverMatchingState, { type MatchState } from "@/components/ride/DriverMatchingState";
import { calculateFare, getFareRules, isNightHour, type FareEstimate } from "@/lib/fare-engine";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import SEOHead from "@/components/SEOHead";

type Step = "location" | "ride-type" | "matching";

/* Fake distance from pickup/dropoff */
function mockDistance(a: SavedPlace | null, b: SavedPlace | null): { km: number; min: number } {
  if (!a?.lat || !b?.lat) return { km: 0, min: 0 };
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = (((b.lng || 0) - (a.lng || 0)) * Math.PI) / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return { km: Math.max(km, 1.5), min: Math.max(Math.round(km * 2.5), 5) };
}

/* Mock nearby drivers */
function mockDrivers(lat: number, lng: number) {
  return Array.from({ length: 4 }, (_, i) => ({
    id: `d${i}`,
    lat: lat + (Math.random() - 0.5) * 0.015,
    lng: lng + (Math.random() - 0.5) * 0.015,
  }));
}

export default function RidePage() {
  const navigate = useNavigate();
  const { geo, currentLocation, places, addRecent, savePlace, removePlace } = useSmartLocation();
  const [step, setStep] = useState<Step>("location");
  const [pickup, setPickup] = useState<SavedPlace | null>(currentLocation);
  const [dropoff, setDropoff] = useState<SavedPlace | null>(null);
  const [selectedType, setSelectedType] = useState<RideType>(RIDE_TYPES[0]);
  const [matchState, setMatchState] = useState<MatchState>("searching");

  const { country: detectedCountry } = useGeoDetect();
  const rules = useMemo(() => getFareRules(detectedCountry), [detectedCountry]);
  const night = useMemo(() => isNightHour(), []);
  const { km, min } = useMemo(() => mockDistance(pickup, dropoff), [pickup, dropoff]);

  const fareEstimate: FareEstimate | null = useMemo(() => {
    if (!km) return null;
    return calculateFare({
      distanceKm: km * selectedType.multiplier,
      durationMin: min,
      rules,
      isNight: night,
    });
  }, [km, min, selectedType, rules, night]);

  const getFare = useCallback((type: RideType): string => {
    if (!km) return "—";
    const est = calculateFare({ distanceKm: km * type.multiplier, durationMin: min, rules, isNight: night });
    return `${est.total.toFixed(2)} ${est.currency}`;
  }, [km, min, rules, night]);

  const drivers = useMemo(() => {
    if (pickup?.lat && pickup?.lng) return mockDrivers(pickup.lat, pickup.lng);
    if (geo.lat && geo.lng) return mockDrivers(geo.lat, geo.lng);
    return [];
  }, [pickup, geo.lat, geo.lng]);

  const handlePickup = (place: SavedPlace) => {
    setPickup(place);
    if (place.address) addRecent(place.address, place.city, place.lat, place.lng);
  };

  const handleDropoff = (place: SavedPlace) => {
    setDropoff(place);
    if (place.address) addRecent(place.address, place.city, place.lat, place.lng);
    setStep("ride-type");
  };

  const handleConfirm = () => {
    setStep("matching");
    setMatchState("searching");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title="Book a Ride" description="Fast, safe rides at your fingertips." />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/10">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => step === "location" ? navigate(-1) : setStep("location")} className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground">Book a Ride</h1>
            <p className="text-[10px] text-muted-foreground">
              {step === "matching" ? "Finding driver…" : "Fast & safe rides"}
            </p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[9px] font-bold text-success">{drivers.length} nearby</span>
          </div>
        </div>
      </div>

      {/* Map — always visible */}
      <RideMap
        pickup={pickup}
        dropoff={dropoff}
        userLat={geo.lat}
        userLng={geo.lng}
        drivers={step !== "matching" ? drivers : []}
        className="h-48 mx-4 mt-3"
      />

      <div className="max-w-lg mx-auto px-4 py-3 space-y-3 flex-1">
        {/* Location pickers (always visible unless matching) */}
        {step !== "matching" && (
          <div className="space-y-2">
            <SmartLocationPicker label="Pickup" value={pickup?.address || ""} onSelect={handlePickup} currentLocation={currentLocation} savedPlaces={places} onSavePlace={savePlace} onRemovePlace={removePlace} placeholder="Your location" />
            <SmartLocationPicker label="Destination" value={dropoff?.address || ""} onSelect={handleDropoff} currentLocation={null} savedPlaces={places} onSavePlace={savePlace} onRemovePlace={removePlace} placeholder="Where to?" autoFocus={!!pickup && !dropoff} />
          </div>
        )}

        {/* Ride type selector */}
        <AnimatePresence>
          {step === "ride-type" && (
            <RideTypeSelector selected={selectedType} onSelect={setSelectedType} getFare={getFare} />
          )}
        </AnimatePresence>

        {/* Fare breakdown */}
        {step === "ride-type" && fareEstimate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border/10 bg-card p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Info className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Fare Breakdown</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <span className="text-muted-foreground">Base fare</span>
              <span className="text-right text-foreground font-medium">{fareEstimate.baseFare} {fareEstimate.currency}</span>
              <span className="text-muted-foreground">Distance ({km.toFixed(1)} km)</span>
              <span className="text-right text-foreground font-medium">{fareEstimate.distanceFee.toFixed(2)} {fareEstimate.currency}</span>
              <span className="text-muted-foreground">Time ({min} min)</span>
              <span className="text-right text-foreground font-medium">{fareEstimate.timeFee.toFixed(2)} {fareEstimate.currency}</span>
              {fareEstimate.isNight && (
                <>
                  <span className="text-warning">Night surcharge</span>
                  <span className="text-right text-warning font-medium">+{fareEstimate.nightSurcharge.toFixed(2)}</span>
                </>
              )}
              <span className="text-muted-foreground">Platform fee</span>
              <span className="text-right text-foreground font-medium">{fareEstimate.platformFee.toFixed(2)}</span>
              <span className="font-bold text-foreground pt-1 border-t border-border/10">Total</span>
              <span className="font-bold text-primary text-right pt-1 border-t border-border/10 text-sm">{fareEstimate.total.toFixed(2)} {fareEstimate.currency}</span>
            </div>
          </motion.div>
        )}

        {/* Confirm button */}
        {step === "ride-type" && pickup && dropoff && fareEstimate && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex items-center justify-center gap-4 py-1">
              {[
                { icon: Shield, label: "Insured ride" },
                { icon: Star, label: "4.9 avg" },
                { icon: Zap, label: "Instant match" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1 text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  <span className="text-[9px]">{label}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={handleConfirm}
              className="w-full h-14 rounded-2xl text-base font-bold bg-primary text-primary-foreground shadow-lg active:scale-[0.97] transition-transform"
            >
              <Car className="h-5 w-5 mr-2" />
              Confirm · {fareEstimate.total.toFixed(2)} {fareEstimate.currency}
            </Button>
          </motion.div>
        )}

        {/* Driver matching & tracking */}
        <AnimatePresence>
          {step === "matching" && (
            <DriverMatchingState state={matchState} onStateChange={setMatchState} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
