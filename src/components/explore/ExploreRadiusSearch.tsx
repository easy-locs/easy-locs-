import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, X, Search, LocateFixed } from "lucide-react";

interface ExploreRadiusSearchProps {
  locationQuery: string;
  radiusKm: number;
  resultCount: number;
  geoCity?: string;
  geoCountry?: string;
  onLocationChange: (v: string) => void;
  onRadiusChange: (km: number) => void;
  onApply: () => void;
  onReset: () => void;
  onNearMe: () => void;
  onClose: () => void;
}

const RADIUS_MARKS = [0, 5, 10, 25, 50, 100, 200];

export function ExploreRadiusSearch({
  locationQuery, radiusKm, resultCount,
  geoCity, geoCountry,
  onLocationChange, onRadiusChange,
  onApply, onReset, onNearMe, onClose,
}: ExploreRadiusSearchProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-5 w-full max-w-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          Location Search
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* City input */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">City or area</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={locationQuery}
            onChange={e => onLocationChange(e.target.value)}
            placeholder="Enter a city..."
            className="pl-10 rounded-xl"
          />
        </div>
        {geoCity && !locationQuery && (
          <button
            onClick={onNearMe}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-accent/10 border border-accent/20 text-sm text-accent font-medium hover:bg-accent/15 transition-colors"
          >
            <LocateFixed className="h-4 w-4" />
            Use my location — {geoCity}, {geoCountry?.toUpperCase()}
          </button>
        )}
      </div>

      {/* Radius slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Radius</label>
          <span className="text-sm font-bold text-accent">
            {radiusKm === 0 ? "All" : `${radiusKm} km`}
          </span>
        </div>
        <Slider
          value={[radiusKm]}
          onValueChange={([v]) => onRadiusChange(v)}
          min={0}
          max={200}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
          {RADIUS_MARKS.map(m => (
            <span key={m} className="cursor-pointer hover:text-foreground" onClick={() => onRadiusChange(m)}>
              {m === 0 ? "All" : `${m}km`}
            </span>
          ))}
        </div>
      </div>

      {/* Map visualization (circle indicator) */}
      <div className="relative w-full aspect-[2/1] rounded-xl bg-muted/50 border border-border overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--accent)/0.08)_0%,transparent_70%)]" />
        {radiusKm > 0 && (
          <motion.div
            key={radiusKm}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-full border-2 border-accent/40 bg-accent/10 flex items-center justify-center"
            style={{
              width: `${Math.min(80, Math.max(20, (radiusKm / 200) * 80))}%`,
              height: `${Math.min(80, Math.max(20, (radiusKm / 200) * 80))}%`,
            }}
          >
            <div className="w-3 h-3 rounded-full bg-accent shadow-lg" />
          </motion.div>
        )}
        {radiusKm === 0 && (
          <span className="text-xs text-muted-foreground font-medium">Worldwide search</span>
        )}
        {radiusKm > 0 && locationQuery && (
          <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md">
            📍 {locationQuery} • {radiusKm} km
          </div>
        )}
      </div>

      {/* Result count */}
      <div className="text-center">
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">{resultCount}</strong> listing{resultCount !== 1 ? "s" : ""} found
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={onApply} className="flex-1 rounded-xl gap-2">
          <Search className="h-4 w-4" /> Apply
        </Button>
        <Button variant="outline" onClick={onReset} className="rounded-xl">
          Reset
        </Button>
      </div>
    </motion.div>
  );
}
