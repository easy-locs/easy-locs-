/**
 * RidePage — /ride — Taxi & Mobility universe.
 * Map-first flow: Pickup → Destination → Fare → Confirm → Track.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Car, Clock, Shield, Star, Zap, ChevronRight, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import SmartLocationPicker from "@/components/location/SmartLocationPicker";
import { useSmartLocation, type SavedPlace } from "@/hooks/useSmartLocation";
import SEOHead from "@/components/SEOHead";

/* ═══ Ride types ═══ */
const RIDE_TYPES = [
  { id: "standard", label: "Standard", icon: "🚗", eta: "4 min", multiplier: 1, seats: 4 },
  { id: "comfort", label: "Comfort", icon: "🚙", eta: "6 min", multiplier: 1.4, seats: 4 },
  { id: "xl", label: "XL", icon: "🚐", eta: "8 min", multiplier: 1.8, seats: 6 },
  { id: "moto", label: "Moto", icon: "🏍️", eta: "2 min", multiplier: 0.7, seats: 1 },
];

/* ═══ Fare estimation ═══ */
function estimateFare(type: typeof RIDE_TYPES[0], hasPickup: boolean, hasDrop: boolean): string {
  if (!hasPickup || !hasDrop) return "—";
  const base = 3.5 + Math.random() * 12;
  return `€${(base * type.multiplier).toFixed(2)}`;
}

type Step = "location" | "ride-type" | "confirm";

export default function RidePage() {
  const navigate = useNavigate();
  const { currentLocation, places, addRecent } = useSmartLocation();
  const [step, setStep] = useState<Step>("location");
  const [pickup, setPickup] = useState<SavedPlace | null>(currentLocation);
  const [dropoff, setDropoff] = useState<SavedPlace | null>(null);
  const [selectedType, setSelectedType] = useState(RIDE_TYPES[0]);

  const fare = useMemo(() => estimateFare(selectedType, !!pickup, !!dropoff), [selectedType, pickup, dropoff]);

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
    setStep("confirm");
    // In production → create ride request, assign driver, navigate to tracking
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Book a Ride" description="Fast, safe rides at your fingertips." />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/10">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground">Book a Ride</h1>
            <p className="text-[10px] text-muted-foreground">Fast & safe rides</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[9px] font-bold text-success">Drivers nearby</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Map placeholder */}
        <div className="h-40 rounded-2xl bg-muted/30 border border-border/10 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="text-center z-10">
            <Car className="h-8 w-8 text-primary/40 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Map view</p>
          </div>
          {/* Mock driver dots */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary"
              animate={{ x: [0, 8, -4, 0], y: [0, -6, 4, 0] }}
              transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
              style={{ top: `${25 + i * 15}%`, left: `${20 + i * 18}%` }}
            />
          ))}
        </div>

        {/* Location pickers */}
        <div className="space-y-3">
          <SmartLocationPicker
            label="Pickup"
            value={pickup?.address || ""}
            onSelect={handlePickup}
            currentLocation={currentLocation}
            savedPlaces={places}
            placeholder="Your location"
          />
          <SmartLocationPicker
            label="Destination"
            value={dropoff?.address || ""}
            onSelect={handleDropoff}
            currentLocation={null}
            savedPlaces={places}
            placeholder="Where to?"
            autoFocus={!!pickup && !dropoff}
          />
        </div>

        {/* Ride type selector */}
        <AnimatePresence>
          {(step === "ride-type" || step === "confirm") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Choose your ride</p>
              <div className="grid grid-cols-2 gap-2">
                {RIDE_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type)}
                    className={`p-3 rounded-2xl border text-left active:scale-[0.97] transition-all ${
                      selectedType.id === type.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/15 bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xl">{type.icon}</span>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Users className="h-2.5 w-2.5" />{type.seats}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-foreground">{type.label}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />{type.eta}
                      </span>
                      <span className="text-xs font-bold text-primary">
                        {estimateFare(type, !!pickup, !!dropoff)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm button */}
        {pickup && dropoff && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 py-2">
              {[
                { icon: Shield, label: "Safe rides" },
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
              Confirm Ride · {fare}
            </Button>
          </motion.div>
        )}

        {/* Confirm step */}
        <AnimatePresence>
          {step === "confirm" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center space-y-2"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 mx-auto rounded-full border-2 border-primary border-t-transparent"
              />
              <p className="text-sm font-bold text-foreground">Finding your driver…</p>
              <p className="text-[10px] text-muted-foreground">Usually under 30 seconds</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
