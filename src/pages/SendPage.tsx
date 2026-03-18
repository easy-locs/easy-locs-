/**
 * SendPage — /send — Full courier universe.
 * Map + Pickup → Dropoff → Package → Price → Confirm → Courier match → Track.
 */
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Shield, Clock, Zap, ChevronRight, Info, Scale, Ruler } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SmartLocationPicker from "@/components/location/SmartLocationPicker";
import { useSmartLocation, type SavedPlace } from "@/hooks/useSmartLocation";
import SendMap from "@/components/send/SendMap";
import DriverMatchingState, { type MatchState } from "@/components/ride/DriverMatchingState";
import { calculateDeliveryFare, getFareRules, isNightHour, type FareEstimate } from "@/lib/fare-engine";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import SEOHead from "@/components/SEOHead";

/* ═══ Delivery speed tiers ═══ */
const SPEEDS = [
  { id: "express", label: "Express", icon: "⚡", eta: "30–60 min", multiplier: 1.5, desc: "Fastest courier" },
  { id: "standard", label: "Standard", icon: "📦", eta: "2–4 hours", multiplier: 1, desc: "Same day" },
  { id: "economy", label: "Economy", icon: "🕐", eta: "Next day", multiplier: 0.7, desc: "Best price" },
];

/* ═══ Package sizes ═══ */
const SIZES = [
  { id: "small", label: "Small", icon: "📱", desc: "Fits in hand", maxKg: 2 },
  { id: "medium", label: "Medium", icon: "📦", desc: "Shoebox", maxKg: 10 },
  { id: "large", label: "Large", icon: "🗃️", desc: "Suitcase", maxKg: 30 },
  { id: "xl", label: "XL", icon: "🪑", desc: "Furniture", maxKg: 50 },
];

function mockDistanceKm(a: SavedPlace | null, b: SavedPlace | null): number {
  if (!a?.lat || !b?.lat) return 0;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = (((b.lng || 0) - (a.lng || 0)) * Math.PI) / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.max(R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa)), 1.2);
}

type Step = "addresses" | "details" | "confirm" | "matching";

export default function SendPage() {
  const navigate = useNavigate();
  const { geo, currentLocation, places, addRecent } = useSmartLocation();
  const [step, setStep] = useState<Step>("addresses");
  const [pickup, setPickup] = useState<SavedPlace | null>(currentLocation);
  const [dropoff, setDropoff] = useState<SavedPlace | null>(null);
  const [speed, setSpeed] = useState(SPEEDS[1]);
  const [size, setSize] = useState(SIZES[1]);
  const [itemDesc, setItemDesc] = useState("");
  const [matchState, setMatchState] = useState<MatchState>("searching");

  const rules = useMemo(() => getFareRules("FR"), []);
  const night = useMemo(() => isNightHour(), []);
  const km = useMemo(() => mockDistanceKm(pickup, dropoff), [pickup, dropoff]);

  const fareEstimate: FareEstimate | null = useMemo(() => {
    if (!km) return null;
    return calculateDeliveryFare({
      distanceKm: km * speed.multiplier,
      weightKg: size.maxKg,
      rules,
      isNight: night,
    });
  }, [km, speed, size, rules, night]);

  const getSpeedFare = useCallback((s: typeof SPEEDS[0]): string => {
    if (!km) return "—";
    const est = calculateDeliveryFare({ distanceKm: km * s.multiplier, weightKg: size.maxKg, rules, isNight: night });
    return `${est.total.toFixed(2)} ${est.currency}`;
  }, [km, size, rules, night]);

  const handlePickup = (place: SavedPlace) => {
    setPickup(place);
    if (place.address) addRecent(place.address, place.city, place.lat, place.lng);
  };
  const handleDropoff = (place: SavedPlace) => {
    setDropoff(place);
    if (place.address) addRecent(place.address, place.city, place.lat, place.lng);
    setStep("details");
  };

  const stepIndex = ["addresses", "details", "confirm", "matching"].indexOf(step);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title="Send a Package" description="Fast courier delivery at your fingertips." />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/10">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => step === "addresses" ? navigate(-1) : setStep(step === "confirm" ? "details" : step === "details" ? "addresses" : "confirm")} className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground">Send a Package</h1>
            <p className="text-[10px] text-muted-foreground">
              {step === "matching" ? "Finding courier…" : "Courier & delivery"}
            </p>
          </div>
          <Package className="h-5 w-5 text-primary/40" />
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-lg mx-auto px-4 pt-2 w-full">
        <div className="flex items-center gap-1">
          {["Addresses", "Details", "Confirm"].map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= Math.min(stepIndex, 2) ? "bg-primary" : "bg-muted/30"}`} />
          ))}
        </div>
      </div>

      {/* Map */}
      <SendMap pickup={pickup} dropoff={dropoff} userLat={geo.lat} userLng={geo.lng} className="h-40 mx-4 mt-3" />

      <div className="max-w-lg mx-auto px-4 py-3 space-y-3 flex-1 w-full">
        {/* Step 1: Addresses */}
        {step === "addresses" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <SmartLocationPicker label="Pickup from" value={pickup?.address || ""} onSelect={handlePickup} currentLocation={currentLocation} savedPlaces={places} placeholder="Pickup address" />
            <SmartLocationPicker label="Deliver to" value={dropoff?.address || ""} onSelect={handleDropoff} currentLocation={null} savedPlaces={places} placeholder="Delivery address" autoFocus={!!pickup && !dropoff} />
          </motion.div>
        )}

        {/* Step 2: Details */}
        {step === "details" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            {/* Package size */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Scale className="h-3 w-3" /> Package size</p>
              <div className="grid grid-cols-4 gap-2">
                {SIZES.map(s => (
                  <button key={s.id} onClick={() => setSize(s)} className={`p-2.5 rounded-2xl border text-center active:scale-[0.97] transition-all ${size.id === s.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/15 bg-card"}`}>
                    <span className="text-lg block mb-0.5">{s.icon}</span>
                    <p className="text-[10px] font-bold text-foreground">{s.label}</p>
                    <p className="text-[8px] text-muted-foreground">≤{s.maxKg}kg</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Speed */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Delivery speed</p>
              {SPEEDS.map(s => (
                <button key={s.id} onClick={() => setSpeed(s)} className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left active:scale-[0.98] transition-all ${speed.id === s.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/15 bg-card"}`}>
                  <span className="text-xl">{s.icon}</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">{s.desc} · {s.eta}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{getSpeedFare(s)}</span>
                </button>
              ))}
            </div>

            {/* Item description */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What are you sending?</p>
              <Input value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="e.g. Documents, electronics, food…" className="h-10 rounded-xl bg-muted/30 border-border/15 text-sm" />
            </div>

            <Button onClick={() => setStep("confirm")} className="w-full h-12 rounded-2xl text-sm font-bold bg-primary text-primary-foreground active:scale-[0.97] transition-transform">
              Review · {fareEstimate ? `${fareEstimate.total.toFixed(2)} ${fareEstimate.currency}` : "—"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && fareEstimate && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            {/* Summary */}
            <div className="rounded-2xl border border-border/15 bg-card p-4 space-y-3">
              <p className="text-xs font-bold text-foreground">Delivery Summary</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-success mt-1.5 shrink-0" />
                  <div><p className="text-[10px] text-muted-foreground">Pickup</p><p className="text-xs font-medium text-foreground">{pickup?.address}</p></div>
                </div>
                <div className="ml-1 w-px h-4 bg-border/30" />
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div><p className="text-[10px] text-muted-foreground">Delivery</p><p className="text-xs font-medium text-foreground">{dropoff?.address}</p></div>
                </div>
              </div>
              <div className="border-t border-border/10 pt-2 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[9px] text-muted-foreground">Size</p><p className="text-xs font-bold text-foreground">{size.icon} {size.label}</p></div>
                <div><p className="text-[9px] text-muted-foreground">Speed</p><p className="text-xs font-bold text-foreground">{speed.label}</p></div>
                <div><p className="text-[9px] text-muted-foreground">Distance</p><p className="text-xs font-bold text-foreground">{km.toFixed(1)} km</p></div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="rounded-2xl border border-border/10 bg-card p-3 space-y-2">
              <div className="flex items-center gap-1.5"><Info className="h-3 w-3 text-muted-foreground" /><p className="text-[10px] font-bold text-muted-foreground uppercase">Price Breakdown</p></div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                <span className="text-muted-foreground">Base fare</span><span className="text-right font-medium text-foreground">{fareEstimate.baseFare} {fareEstimate.currency}</span>
                <span className="text-muted-foreground">Distance ({km.toFixed(1)} km)</span><span className="text-right font-medium text-foreground">{fareEstimate.distanceFee.toFixed(2)} {fareEstimate.currency}</span>
                {fareEstimate.isNight && (<><span className="text-warning">Night surcharge</span><span className="text-right text-warning font-medium">+{fareEstimate.nightSurcharge.toFixed(2)}</span></>)}
                <span className="text-muted-foreground">Platform fee</span><span className="text-right font-medium text-foreground">{fareEstimate.platformFee.toFixed(2)}</span>
                <span className="font-bold text-foreground pt-1 border-t border-border/10">Total</span>
                <span className="font-bold text-primary text-right pt-1 border-t border-border/10 text-sm">{fareEstimate.total.toFixed(2)} {fareEstimate.currency}</span>
              </div>
            </div>

            {/* Trust */}
            <div className="flex items-center justify-center gap-4 py-1">
              {[{ icon: Shield, label: "Insured" }, { icon: Clock, label: "Real-time tracking" }, { icon: Zap, label: "Fast match" }].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1 text-muted-foreground"><Icon className="h-3 w-3" /><span className="text-[9px]">{label}</span></div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("details")} className="flex-1 h-12 rounded-2xl text-sm">Back</Button>
              <Button onClick={() => { setStep("matching"); setMatchState("searching"); }} className="flex-1 h-14 rounded-2xl text-base font-bold bg-primary text-primary-foreground shadow-lg active:scale-[0.97] transition-transform">
                <Package className="h-5 w-5 mr-2" />
                Send · {fareEstimate.total.toFixed(2)} {fareEstimate.currency}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Matching */}
        <AnimatePresence>
          {step === "matching" && <DriverMatchingState state={matchState} onStateChange={setMatchState} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
