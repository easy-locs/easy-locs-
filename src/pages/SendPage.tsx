/**
 * SendPage — /send — Delivery / Courier universe.
 * Flow: Pickup → Dropoff → Item details → Price → Confirm → Track.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Bike, Truck, Clock, Shield, Zap, Scale, Ruler, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SmartLocationPicker from "@/components/location/SmartLocationPicker";
import { useSmartLocation, type SavedPlace } from "@/hooks/useSmartLocation";
import SEOHead from "@/components/SEOHead";

/* ═══ Delivery speed tiers ═══ */
const DELIVERY_SPEEDS = [
  { id: "express", label: "Express", icon: "⚡", eta: "30–60 min", multiplier: 1.5, desc: "Fastest courier" },
  { id: "standard", label: "Standard", icon: "📦", eta: "2–4 hours", multiplier: 1, desc: "Same day" },
  { id: "economy", label: "Economy", icon: "🕐", eta: "Next day", multiplier: 0.7, desc: "Best price" },
];

/* ═══ Package sizes ═══ */
const PACKAGE_SIZES = [
  { id: "small", label: "Small", icon: "📱", desc: "Fits in hand", maxKg: 2 },
  { id: "medium", label: "Medium", icon: "📦", desc: "Shoebox", maxKg: 10 },
  { id: "large", label: "Large", icon: "🗃️", desc: "Suitcase", maxKg: 30 },
  { id: "xl", label: "XL", icon: "🪑", desc: "Furniture", maxKg: 50 },
];

function estimatePrice(speed: typeof DELIVERY_SPEEDS[0], size: typeof PACKAGE_SIZES[0]): string {
  const base = 4.5 + size.maxKg * 0.3;
  return `€${(base * speed.multiplier).toFixed(2)}`;
}

type Step = "addresses" | "details" | "confirm";

export default function SendPage() {
  const navigate = useNavigate();
  const { currentLocation, places, addRecent } = useSmartLocation();
  const [step, setStep] = useState<Step>("addresses");
  const [pickup, setPickup] = useState<SavedPlace | null>(currentLocation);
  const [dropoff, setDropoff] = useState<SavedPlace | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState(DELIVERY_SPEEDS[1]);
  const [selectedSize, setSelectedSize] = useState(PACKAGE_SIZES[1]);
  const [itemDesc, setItemDesc] = useState("");

  const price = useMemo(() => estimatePrice(selectedSpeed, selectedSize), [selectedSpeed, selectedSize]);

  const handlePickup = (place: SavedPlace) => {
    setPickup(place);
    if (place.address) addRecent(place.address, place.city, place.lat, place.lng);
  };

  const handleDropoff = (place: SavedPlace) => {
    setDropoff(place);
    if (place.address) addRecent(place.address, place.city, place.lat, place.lng);
    setStep("details");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Send a Package" description="Fast courier delivery at your fingertips." />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/10">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground">Send a Package</h1>
            <p className="text-[10px] text-muted-foreground">Courier & delivery</p>
          </div>
          <Package className="h-5 w-5 text-primary/40" />
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="flex items-center gap-1">
          {["Addresses", "Details", "Confirm"].map((s, i) => {
            const stepIndex = ["addresses", "details", "confirm"].indexOf(step);
            return (
              <div key={s} className="flex-1 flex items-center gap-1">
                <div className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIndex ? "bg-primary" : "bg-muted/30"}`} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1 mb-3">
          {["Addresses", "Details", "Confirm"].map((s, i) => {
            const stepIndex = ["addresses", "details", "confirm"].indexOf(step);
            return <span key={s} className={`text-[8px] font-medium ${i <= stepIndex ? "text-primary" : "text-muted-foreground/40"}`}>{s}</span>;
          })}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-8 space-y-4">
        {/* Step 1: Addresses */}
        {step === "addresses" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <SmartLocationPicker
              label="Pickup from"
              value={pickup?.address || ""}
              onSelect={handlePickup}
              currentLocation={currentLocation}
              savedPlaces={places}
              placeholder="Pickup address"
            />
            <SmartLocationPicker
              label="Deliver to"
              value={dropoff?.address || ""}
              onSelect={handleDropoff}
              currentLocation={null}
              savedPlaces={places}
              placeholder="Delivery address"
              autoFocus={!!pickup && !dropoff}
            />
          </motion.div>
        )}

        {/* Step 2: Details */}
        {step === "details" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {/* Package size */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Package size</p>
              <div className="grid grid-cols-4 gap-2">
                {PACKAGE_SIZES.map(size => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size)}
                    className={`p-3 rounded-2xl border text-center active:scale-[0.97] transition-all ${
                      selectedSize.id === size.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/15 bg-card"
                    }`}
                  >
                    <span className="text-xl block mb-1">{size.icon}</span>
                    <p className="text-[10px] font-bold text-foreground">{size.label}</p>
                    <p className="text-[8px] text-muted-foreground">{size.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Speed */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Delivery speed</p>
              <div className="space-y-1.5">
                {DELIVERY_SPEEDS.map(speed => (
                  <button
                    key={speed.id}
                    onClick={() => setSelectedSpeed(speed)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left active:scale-[0.98] transition-all ${
                      selectedSpeed.id === speed.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/15 bg-card"
                    }`}
                  >
                    <span className="text-xl">{speed.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground">{speed.label}</p>
                      <p className="text-[10px] text-muted-foreground">{speed.desc} · {speed.eta}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{estimatePrice(speed, selectedSize)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Item description */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What are you sending?</p>
              <Input
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="e.g. Documents, electronics, food…"
                className="h-10 rounded-xl bg-muted/30 border-border/15 text-sm"
              />
            </div>

            <Button
              onClick={() => setStep("confirm")}
              className="w-full h-12 rounded-2xl text-sm font-bold bg-primary text-primary-foreground active:scale-[0.97] transition-transform"
            >
              Review · {price}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {/* Summary card */}
            <div className="rounded-2xl border border-border/15 bg-card p-4 space-y-3">
              <p className="text-xs font-bold text-foreground">Delivery Summary</p>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-success mt-1.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Pickup</p>
                    <p className="text-xs font-medium text-foreground">{pickup?.address}</p>
                  </div>
                </div>
                <div className="ml-1 w-px h-4 bg-border/30" />
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Delivery</p>
                    <p className="text-xs font-medium text-foreground">{dropoff?.address}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/10 pt-2 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[9px] text-muted-foreground">Size</p>
                  <p className="text-xs font-bold text-foreground">{selectedSize.icon} {selectedSize.label}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Speed</p>
                  <p className="text-xs font-bold text-foreground">{selectedSpeed.label}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">ETA</p>
                  <p className="text-xs font-bold text-foreground">{selectedSpeed.eta}</p>
                </div>
              </div>

              {itemDesc && (
                <div className="border-t border-border/10 pt-2">
                  <p className="text-[9px] text-muted-foreground">Contents</p>
                  <p className="text-xs text-foreground">{itemDesc}</p>
                </div>
              )}
            </div>

            {/* Trust */}
            <div className="flex items-center justify-center gap-4 py-1">
              {[
                { icon: Shield, label: "Insured" },
                { icon: Clock, label: "Real-time tracking" },
                { icon: Zap, label: "Fast match" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1 text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  <span className="text-[9px]">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("details")}
                className="flex-1 h-12 rounded-2xl text-sm"
              >
                Back
              </Button>
              <Button
                className="flex-1 h-14 rounded-2xl text-base font-bold bg-primary text-primary-foreground shadow-lg active:scale-[0.97] transition-transform"
              >
                <Package className="h-5 w-5 mr-2" />
                Send · {price}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
