/**
 * RidePage — Careem-style ride home with map hero, "Where to?" overlay, vehicle types, and ride categories.
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, CalendarDays, Menu, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSmartLocation } from "@/hooks/useSmartLocation";
import { useGeoDetect } from "@/hooks/useGeoDetect";
import RideMap from "@/components/ride/RideMap";
import SEOHead from "@/components/SEOHead";
import { routes } from "@/lib/routes";

import rideEconomy from "@/assets/ride-economy.png";
import rideComfort from "@/assets/ride-comfort.png";
import rideXl from "@/assets/ride-xl.png";
import rideBike from "@/assets/ride-bike.png";
import rideSchedule from "@/assets/ride-schedule.png";
import rideIntercity from "@/assets/ride-intercity.png";

const DUBAI_CENTER = { lat: 25.2048, lng: 55.2708 };

function mockDrivers(lat: number, lng: number) {
  return Array.from({ length: 5 }, (_, i) => ({
    id: `d${i}`,
    lat: lat + (Math.random() - 0.5) * 0.02,
    lng: lng + (Math.random() - 0.5) * 0.02,
  }));
}

const RIDE_CATEGORIES = [
  { id: "schedule", label: "Schedule", image: rideSchedule, action: "schedule" },
  { id: "intercity", label: "City to City", image: rideIntercity, action: "intercity" },
] as const;

export default function RidePage() {
  const navigate = useNavigate();
  const { geo, currentLocation, places } = useSmartLocation();
  const [showSchedule, setShowSchedule] = useState(false);

  const userLat = geo.lat || DUBAI_CENTER.lat;
  const userLng = geo.lng || DUBAI_CENTER.lng;

  const drivers = useMemo(() => mockDrivers(userLat, userLng), [userLat, userLng]);

  const recentPlaces = places.filter(p => p.address && p.type === "recent").slice(0, 3);
  const savedPlaces = places.filter(p => (p.type === "home" || p.type === "work") && p.address);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title="Ride" description="Book a ride — cars, bikes, scheduled, intercity." />

      {/* Map Hero with overlay */}
      <div className="relative h-[55vh] min-h-[320px]">
        {/* Back + Menu buttons */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-card/90 backdrop-blur-md border border-border/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <ArrowLeft className="h-4.5 w-4.5 text-foreground" />
          </button>
        </div>
        <div className="absolute top-4 right-4 z-20">
          <button className="w-10 h-10 rounded-xl bg-card/90 backdrop-blur-md border border-border/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
            <Menu className="h-4.5 w-4.5 text-foreground" />
          </button>
        </div>

        {/* Map */}
        <RideMap
          pickup={null}
          dropoff={null}
          userLat={userLat}
          userLng={userLng}
          drivers={drivers}
          className="h-full w-full !rounded-none !border-0"
        />

        {/* "Where to?" search card — overlapping map bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 translate-y-1/2 px-4">
          <motion.button
            onClick={() => navigate("/ride/search")}
            className="w-full bg-card rounded-2xl shadow-xl border border-border/20 px-4 py-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <span className="text-base font-semibold text-foreground flex-1 text-left">Where to?</span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowSchedule(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/30 bg-muted/30 active:scale-95 transition-transform"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Later</span>
            </button>
          </motion.button>
        </div>
      </div>

      {/* Content below search card */}
      <div className="px-4 pt-14 pb-6 space-y-6 flex-1">
        {/* Saved / Recent places */}
        {(savedPlaces.length > 0 || recentPlaces.length > 0) && (
          <div className="space-y-1">
            {[...savedPlaces, ...recentPlaces].slice(0, 3).map((place) => (
              <button
                key={place.id}
                onClick={() => navigate("/ride/search", { state: { dropoffLabel: place.address, dropoffLat: place.lat, dropoffLng: place.lng } })}
                className="w-full flex items-center gap-3 px-1 py-3 border-b border-border/10 last:border-0 active:bg-muted/20 rounded-lg transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{place.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Vehicle Types — Horizontal scroll */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-foreground">Choose your ride</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {[
              { id: "economy", label: "Economy", desc: "Affordable rides", eta: "4 min", image: rideEconomy },
              { id: "comfort", label: "Comfort", desc: "Premium sedan", eta: "6 min", image: rideComfort },
              { id: "xl", label: "XL", desc: "6+ seats", eta: "8 min", image: rideXl },
              { id: "bike", label: "Bike", desc: "Fast & cheap", eta: "2 min", image: rideBike },
            ].map((vehicle) => (
              <motion.button
                key={vehicle.id}
                onClick={() => navigate("/ride/search", { state: { vehicleType: vehicle.id } })}
                className="shrink-0 w-[140px] rounded-2xl border border-border/20 bg-card p-3 text-left active:scale-[0.96] transition-all hover:shadow-md"
                whileTap={{ scale: 0.96 }}
              >
                <div className="h-20 flex items-center justify-center mb-2">
                  <img src={vehicle.image} alt={vehicle.label} className="h-16 w-auto object-contain" />
                </div>
                <p className="text-sm font-bold text-foreground">{vehicle.label}</p>
                <p className="text-[10px] text-muted-foreground">{vehicle.desc}</p>
                <div className="mt-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-medium text-emerald-600">{vehicle.eta}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Rides for every need */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-foreground">Rides for every need</h2>
          <div className="grid grid-cols-2 gap-3">
            {RIDE_CATEGORIES.map((cat) => (
              <motion.button
                key={cat.id}
                onClick={() => cat.action === "schedule" ? setShowSchedule(true) : navigate("/ride/search", { state: { mode: cat.action } })}
                className="rounded-2xl border border-border/15 bg-card p-4 text-left active:scale-[0.96] transition-all hover:shadow-md"
                whileTap={{ scale: 0.96 }}
              >
                <div className="h-16 flex items-center justify-center mb-2">
                  <img src={cat.image} alt={cat.label} className="h-14 w-auto object-contain" />
                </div>
                <p className="text-sm font-semibold text-foreground text-center">{cat.label}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Bottom Sheet */}
      <AnimatePresence>
        {showSchedule && (
          <ScheduleSheet onClose={() => setShowSchedule(false)} onConfirm={(date, time) => {
            setShowSchedule(false);
            navigate("/ride/search", { state: { scheduledDate: date, scheduledTime: time } });
          }} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Schedule Bottom Sheet ─── */
function ScheduleSheet({ onClose, onConfirm }: { onClose: () => void; onConfirm: (date: string, time: string) => void }) {
  const now = new Date();
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(now.getMinutes());

  const today = now.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" });
  const dateStr = now.toISOString().split("T")[0];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[85vh] overflow-hidden"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="px-5 pb-8 space-y-6">
          {/* Date badge */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-foreground text-background rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] font-bold uppercase">{now.toLocaleDateString("en-US", { month: "short" })}</p>
              <p className="text-xl font-black">{now.getDate()}</p>
            </div>
            <h2 className="text-xl font-bold text-foreground text-center">When would you like to be picked up?</h2>
            <p className="text-xs text-muted-foreground">Free cancellation up to 1 hour before pickup</p>
          </div>

          {/* Day selector */}
          <div className="flex items-center justify-between px-2 py-3 border-y border-border/15">
            <div>
              <p className="text-sm font-bold text-foreground">Today</p>
              <p className="text-xs text-muted-foreground">{today}</p>
            </div>
            <button className="text-muted-foreground">›</button>
          </div>

          {/* Time picker — simplified wheel-style */}
          <div className="flex justify-center items-center gap-4 py-6">
            <div className="relative h-[180px] w-20 overflow-hidden">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-muted/30 rounded-lg z-0" />
              <div className="flex flex-col items-center justify-center h-full relative z-10">
                {[-2, -1, 0, 1, 2].map(offset => {
                  const h = (hour + offset + 24) % 24;
                  const isCenter = offset === 0;
                  return (
                    <button
                      key={offset}
                      onClick={() => setHour(h)}
                      className={`h-9 flex items-center justify-center transition-all ${
                        isCenter ? "text-2xl font-black text-foreground" : "text-base text-muted-foreground/40"
                      }`}
                    >
                      {String(h).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>
            <span className="text-2xl font-black text-foreground">:</span>
            <div className="relative h-[180px] w-20 overflow-hidden">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-muted/30 rounded-lg z-0" />
              <div className="flex flex-col items-center justify-center h-full relative z-10">
                {[-2, -1, 0, 1, 2].map(offset => {
                  const m = (minute + offset + 60) % 60;
                  const isCenter = offset === 0;
                  return (
                    <button
                      key={offset}
                      onClick={() => setMinute(m)}
                      className={`h-9 flex items-center justify-center transition-all ${
                        isCenter ? "text-2xl font-black text-foreground" : "text-base text-muted-foreground/40"
                      }`}
                    >
                      {String(m).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={() => onConfirm(dateStr, `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base active:scale-[0.97] transition-transform"
            >
              Confirm date and time
            </button>
            <button
              onClick={() => { onClose(); }}
              className="w-full h-14 rounded-2xl border border-border/30 bg-card text-foreground font-bold text-base active:scale-[0.97] transition-transform"
            >
              Book ride for now
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
