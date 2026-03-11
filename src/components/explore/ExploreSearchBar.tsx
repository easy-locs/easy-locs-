import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, MapPin, Globe, X, ChevronDown,
  LocateFixed, CheckCircle, Radar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RADIUS_OPTIONS, type RadiusValue } from "@/lib/geo-distance";

interface LocationSuggestion {
  label: string;
  type: "geo" | "city" | "country";
}

interface ExploreSearchBarProps {
  searchQuery: string;
  locationQuery: string;
  radius: RadiusValue;
  radiusLabel: string;
  geoCity?: string;
  geoCountry?: string;
  locationSuggestions: LocationSuggestion[];
  onSearchQueryChange: (v: string) => void;
  onLocationQueryChange: (v: string) => void;
  onRadiusChange: (v: RadiusValue) => void;
  onSelectLocation: (s: LocationSuggestion) => void;
  onNearMe: () => void;
  onSearch: () => void;
}

export function ExploreDesktopSearchBar({
  searchQuery, locationQuery, radius, radiusLabel,
  geoCity, geoCountry, locationSuggestions,
  onSearchQueryChange, onLocationQueryChange, onRadiusChange,
  onSelectLocation, onNearMe, onSearch,
}: ExploreSearchBarProps) {
  const locationRef = useRef<HTMLDivElement>(null);
  const radiusRef = useRef<HTMLDivElement>(null);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showRadiusMenu, setShowRadiusMenu] = useState(false);

  // Close on outside click
  const handleMouseDown = (e: React.MouseEvent) => {
    // handled by parent
  };

  return (
    <div className="hidden md:flex items-center flex-1 max-w-3xl mx-8">
      <div className="flex items-center w-full bg-card border border-border rounded-full shadow-sm hover:shadow-md transition-shadow relative">
        {/* What */}
        <div className="flex-1 px-5 py-2 border-r border-border">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">What</label>
          <Input
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSearch()}
            placeholder="Service, property..."
            className="border-0 p-0 h-6 text-sm bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Where */}
        <div className="flex-1 px-5 py-2 border-r border-border relative" ref={locationRef}>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Where</label>
          <div className="flex items-center gap-1">
            <Input
              value={locationQuery}
              onChange={e => { onLocationQueryChange(e.target.value); setShowLocationSuggestions(true); }}
              onFocus={() => setShowLocationSuggestions(true)}
              onKeyDown={e => e.key === "Enter" && onSearch()}
              placeholder={geoCity ? `${geoCity}, ${geoCountry?.toUpperCase()}` : "City, country..."}
              className="border-0 p-0 h-6 text-sm bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 flex-1"
            />
            {geoCity && !locationQuery && (
              <button onClick={onNearMe} className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors" title="Use my location">
                <LocateFixed className="h-3.5 w-3.5 text-accent" />
              </button>
            )}
          </div>
          <AnimatePresence>
            {showLocationSuggestions && locationSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {locationSuggestions.map((s, i) => (
                  <button key={`${s.type}-${s.label}-${i}`} onClick={() => { onSelectLocation(s); setShowLocationSuggestions(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0">
                    {s.type === "geo" ? <LocateFixed className="h-4 w-4 text-accent shrink-0" /> : s.type === "city" ? <MapPin className="h-4 w-4 text-muted-foreground shrink-0" /> : <Globe className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className="truncate text-foreground">{s.label}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground uppercase">{s.type === "geo" ? "Near you" : s.type}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Radius */}
        <div className="px-4 py-2 relative" ref={radiusRef}>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Radius</label>
          <button
            onClick={() => setShowRadiusMenu(v => !v)}
            className="flex items-center gap-1 h-6 text-sm text-foreground font-medium hover:text-accent transition-colors"
          >
            <Radar className="h-3.5 w-3.5" />
            {radiusLabel}
            <ChevronDown className="h-3 w-3" />
          </button>
          <AnimatePresence>
            {showRadiusMenu && (
              <motion.div
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden w-44"
              >
                {RADIUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { onRadiusChange(opt.value); setShowRadiusMenu(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 ${
                      radius === opt.value ? "text-accent font-semibold bg-accent/5" : "text-foreground"
                    }`}
                  >
                    {radius === opt.value && <CheckCircle className="h-3.5 w-3.5 text-accent" />}
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={onSearch} className="shrink-0 w-10 h-10 mr-1.5 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface MobileSearchProps {
  searchQuery: string;
  locationQuery: string;
  radius: RadiusValue;
  geoCity?: string;
  geoCountry?: string;
  hasFilters: boolean;
  onSearchQueryChange: (v: string) => void;
  onLocationQueryChange: (v: string) => void;
  onRadiusChange: (v: RadiusValue) => void;
  onNearMe: () => void;
  onSearch: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function ExploreMobileSearch({
  searchQuery, locationQuery, radius, geoCity, geoCountry, hasFilters,
  onSearchQueryChange, onLocationQueryChange, onRadiusChange,
  onNearMe, onSearch, onClearAll, onClose,
}: MobileSearchProps) {
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden pb-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => onSearchQueryChange(e.target.value)} placeholder="What are you looking for?" className="pl-10 rounded-xl" />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={locationQuery} onChange={e => onLocationQueryChange(e.target.value)} placeholder={geoCity ? `${geoCity}, ${geoCountry?.toUpperCase()}` : "City or country"} className="pl-10 rounded-xl" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RADIUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onRadiusChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                radius === opt.value ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {geoCity && !locationQuery && (
          <button onClick={onNearMe} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-accent/10 border border-accent/20 text-sm text-accent font-medium hover:bg-accent/15 transition-colors">
            <LocateFixed className="h-4 w-4" />
            Near me — {geoCity}, {geoCountry?.toUpperCase()}
          </button>
        )}
        <div className="flex gap-2">
          <Button onClick={() => { onSearch(); onClose(); }} className="flex-1 rounded-xl gap-2">
            <Search className="h-4 w-4" /> Search
          </Button>
          {hasFilters && <Button variant="outline" onClick={onClearAll} className="rounded-xl"><X className="h-4 w-4" /></Button>}
        </div>
      </div>
    </motion.div>
  );
}
