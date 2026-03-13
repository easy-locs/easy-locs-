/**
 * ExploreAdvancedFilters — Category-dependent advanced filters.
 * Price range, availability, rating, instant booking.
 */
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, X, Star, Zap, CalendarCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface AdvancedFilters {
  priceMin: number;
  priceMax: number;
  minRating: number;
  instantBooking: boolean;
  availableNow: boolean;
}

const DEFAULT_FILTERS: AdvancedFilters = {
  priceMin: 0,
  priceMax: 50000,
  minRating: 0,
  instantBooking: false,
  availableNow: false,
};

interface Props {
  filters: AdvancedFilters;
  onChange: (filters: AdvancedFilters) => void;
  onReset: () => void;
  activeGroup: string;
}

export const defaultAdvancedFilters = DEFAULT_FILTERS;

export default function ExploreAdvancedFilters({ filters, onChange, onReset, activeGroup }: Props) {
  const [open, setOpen] = useState(false);

  const hasActive = filters.priceMin > 0 || filters.priceMax < 50000 || filters.minRating > 0 || filters.instantBooking || filters.availableNow;
  const activeCount = [
    filters.priceMin > 0 || filters.priceMax < 50000,
    filters.minRating > 0,
    filters.instantBooking,
    filters.availableNow,
  ].filter(Boolean).length;

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all border ${
          hasActive
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
        {activeCount > 0 && (
          <Badge className="h-4 min-w-[16px] px-1 text-[10px] bg-primary text-primary-foreground">{activeCount}</Badge>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 rounded-xl bg-card border border-border space-y-5">
              {/* Price Range */}
              <div>
                <p className="text-xs font-medium text-foreground mb-2">
                  💰 Price Range: {filters.priceMin.toLocaleString()} — {filters.priceMax >= 50000 ? "50,000+" : filters.priceMax.toLocaleString()}
                </p>
                <Slider
                  min={0}
                  max={50000}
                  step={100}
                  value={[filters.priceMin, filters.priceMax]}
                  onValueChange={([min, max]) => onChange({ ...filters, priceMin: min, priceMax: max })}
                  className="w-full"
                />
              </div>

              {/* Rating */}
              <div>
                <p className="text-xs font-medium text-foreground mb-2">
                  <Star className="h-3 w-3 inline mr-1" />
                  Minimum Rating: {filters.minRating > 0 ? `${filters.minRating}+` : "Any"}
                </p>
                <div className="flex gap-2">
                  {[0, 3, 3.5, 4, 4.5].map(r => (
                    <button
                      key={r}
                      onClick={() => onChange({ ...filters, minRating: r })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filters.minRating === r
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {r === 0 ? "Any" : `${r}★`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick toggles */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-accent" />
                    <span className="text-xs text-foreground">Instant Booking</span>
                  </div>
                  <Switch checked={filters.instantBooking} onCheckedChange={(v) => onChange({ ...filters, instantBooking: v })} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-foreground">Available Now</span>
                  </div>
                  <Switch checked={filters.availableNow} onCheckedChange={(v) => onChange({ ...filters, availableNow: v })} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                <Button variant="ghost" size="sm" onClick={() => { onReset(); setOpen(false); }} className="text-xs">
                  <X className="h-3 w-3 mr-1" /> Reset
                </Button>
                <Button size="sm" onClick={() => setOpen(false)} className="text-xs ml-auto">
                  Apply
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
