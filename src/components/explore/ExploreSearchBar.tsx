import { useRef, useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Search, MapPin, Globe, X, ChevronDown,
  LocateFixed, Radar, Navigation, Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_HIERARCHY } from "@/lib/category-hierarchy";

/* ─── Types ─── */
export interface LocationSuggestion {
  label: string;
  type: "geo" | "city" | "country";
}

interface ExploreSearchBarProps {
  searchQuery: string;
  locationQuery: string;
  radiusKm: number;
  activeGroup: string;
  geoCity?: string;
  geoCountry?: string;
  geoLat?: number;
  geoLng?: number;
  locationSuggestions: LocationSuggestion[];
  resultCount: number;
  onSearchQueryChange: (v: string) => void;
  onLocationQueryChange: (v: string) => void;
  onRadiusKmChange: (km: number) => void;
  onGroupChange: (g: string) => void;
  onSelectLocation: (s: LocationSuggestion) => void;
  onNearMe: () => void;
  onSearch: () => void;
  onReset: () => void;
}

/* ─── Shared map helpers ─── */
function lonToTileX(lon: number, z: number) { return Math.floor(((lon + 180) / 360) * Math.pow(2, z)); }
function latToTileY(lat: number, z: number) {
  return Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, z));
}
function tileXToLon(x: number, z: number) { return (x / Math.pow(2, z)) * 360 - 180; }
function tileYToLat(y: number, z: number) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function getZoomForRadius(km: number) {
  if (km <= 0) return 5;
  if (km <= 5) return 13;
  if (km <= 10) return 12;
  if (km <= 25) return 10;
  if (km <= 50) return 9;
  if (km <= 100) return 8;
  return 7;
}

const RADIUS_STEPS = [0, 5, 10, 25, 50, 100, 200];

/* ─── Category quick-select (What dropdown) ─── */
function CategoryQuickSelect({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeLabel = active === "all"
    ? "All categories"
    : CATEGORY_HIERARCHY.find(g => g.value === active)?.label || "All";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 h-6 text-sm text-foreground font-medium hover:text-accent transition-colors whitespace-nowrap"
      >
        <Layers className="h-3.5 w-3.5" />
        <span className="max-w-[120px] truncate">{activeLabel}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute top-full left-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1"
          >
            <button
              onClick={() => { onChange("all"); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors ${active === "all" ? "text-accent font-semibold" : "text-foreground"}`}
            >
              <Globe className="h-4 w-4 shrink-0" />
              All categories
            </button>
            {CATEGORY_HIERARCHY.map(g => (
              <button
                key={g.value}
                onClick={() => { onChange(g.value); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors ${active === g.value ? "text-accent font-semibold" : "text-foreground"}`}
              >
                <span className="text-base leading-none shrink-0">{g.emoji}</span>
                {g.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── OSM tile grid ─── */
function MapTiles({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const cx = lonToTileX(center.lng, zoom);
  const cy = latToTileY(center.lat, zoom);
  const tileLonLeft = tileXToLon(cx, zoom);
  const tileLonRight = tileXToLon(cx + 1, zoom);
  const tileLatTop = tileYToLat(cy, zoom);
  const tileLatBottom = tileYToLat(cy + 1, zoom);
  const fracX = (center.lng - tileLonLeft) / (tileLonRight - tileLonLeft);
  const fracY = (tileLatTop - center.lat) / (tileLatTop - tileLatBottom);
  const offsetX = -(fracX * 256 + 256);
  const offsetY = -(fracY * 256 + 256);

  const tiles: Array<{ x: number; y: number }> = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tiles.push({ x: cx + dx, y: cy + dy });

  return (
    <div className="absolute" style={{ width: 256 * 3, height: 256 * 3, left: `calc(50% + ${offsetX}px)`, top: `calc(50% + ${offsetY}px)` }}>
      {tiles.map(tile => (
        <img key={`${tile.x}-${tile.y}-${zoom}`} src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`} alt=""
          className="absolute" style={{ width: 256, height: 256, left: (tile.x - cx + 1) * 256, top: (tile.y - cy + 1) * 256 }} loading="eager" crossOrigin="anonymous" />
      ))}
    </div>
  );
}

/* ─── Nominatim autocomplete hook ─── */
function useNominatimSearch(query: string) {
  const [results, setResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`);
        setResults(await res.json() || []);
      } catch { setResults([]); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query]);

  return results;
}

/* ─── Inline map panel (shared between desktop & mobile) ─── */
function RadiusMapPanel({
  locationQuery, radiusKm,
  geoCity, geoCountry, center,
  nominatimResults, showNominatim,
  onLocationInput, onSelectNominatim,
  onRadiusChange, onNearMe, onApply, onReset,
}: {
  locationQuery: string; radiusKm: number;
  geoCity?: string; geoCountry?: string;
  center: { lat: number; lng: number };
  nominatimResults: Array<{ display_name: string; lat: string; lon: string }>;
  showNominatim: boolean;
  onLocationInput: (v: string) => void;
  onSelectNominatim: (s: { display_name: string; lat: string; lon: string }) => void;
  onRadiusChange: (km: number) => void;
  onNearMe: () => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const zoom = getZoomForRadius(radiusKm);
  const metersPerPixel = (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const circlePx = radiusKm > 0 ? Math.min(240, Math.max(30, (radiusKm * 1000 * 2) / metersPerPixel)) : 0;

  return (
    <div className="space-y-4">
      {/* City input with autocomplete */}
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={locationQuery}
            onChange={e => onLocationInput(e.target.value)}
            placeholder="City, country, address…"
            className="pl-10 rounded-xl h-11 text-sm"
          />
          {locationQuery && (
            <button onClick={() => onLocationInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <AnimatePresence>
          {showNominatim && nominatimResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden max-h-48 overflow-y-auto">
              {nominatimResults.map((s, i) => (
                <button key={i} onClick={() => onSelectNominatim(s)}
                  className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2 border-b border-border/30 last:border-0">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{s.display_name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Near me */}
      {geoCity && !locationQuery && (
        <button onClick={onNearMe}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-sm text-accent font-medium hover:bg-accent/15 transition-colors">
          <LocateFixed className="h-4 w-4" />
          My location — {geoCity}, {geoCountry?.toUpperCase()}
        </button>
      )}

      {/* Interactive map */}
      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-border bg-muted">
        <MapTiles center={center} zoom={zoom} />
        {radiusKm > 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent/60 pointer-events-none transition-all duration-300"
            style={{ width: Math.min(90, circlePx) + "%", height: Math.min(90, circlePx) + "%", background: "hsl(var(--accent) / 0.15)" }} />
        )}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-4 h-4 rounded-full bg-accent border-2 border-background shadow-lg" />
        </div>
        {radiusKm === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <span className="text-xs text-muted-foreground font-medium px-3 py-1.5 bg-background/80 rounded-full">Worldwide</span>
          </div>
        )}
        {locationQuery && radiusKm > 0 && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/90 border border-border text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
              <MapPin className="h-3 w-3 text-accent" />
              {locationQuery} · {radiusKm} km
            </span>
          </div>
        )}
      </div>

      {/* Radius slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Search radius</span>
          <span className="text-sm font-bold text-accent">{radiusKm === 0 ? "Worldwide" : `${radiusKm} km`}</span>
        </div>
        <Slider value={[radiusKm]} onValueChange={([v]) => onRadiusChange(v)} min={0} max={200} step={5} className="w-full" />
        <div className="flex justify-between">
          {RADIUS_STEPS.map(v => (
            <button key={v} onClick={() => onRadiusChange(v)}
              className={`text-[10px] font-medium transition-colors ${radiusKm === v ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}>
              {v === 0 ? "All" : `${v}`}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onReset} size="sm" className="flex-1 rounded-xl h-10 text-xs font-semibold">
          Reset
        </Button>
        <Button onClick={onApply} size="sm" className="flex-1 rounded-xl h-10 text-xs font-bold bg-accent hover:bg-accent/90 text-accent-foreground">
          <Search className="h-3.5 w-3.5 mr-1.5" />
          Apply
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DESKTOP SEARCH BAR — 3-level: What | Where | Radius
   ═══════════════════════════════════════════════════ */
export function ExploreDesktopSearchBar({
  searchQuery, locationQuery, radiusKm, activeGroup,
  geoCity, geoCountry, geoLat, geoLng,
  locationSuggestions, resultCount,
  onSearchQueryChange, onLocationQueryChange, onRadiusKmChange, onGroupChange,
  onSelectLocation, onNearMe, onSearch, onReset,
}: ExploreSearchBarProps) {
  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: geoLat || 48.8566, lng: geoLng || 2.3522 });
  const [showNominatim, setShowNominatim] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const nominatimResults = useNominatimSearch(showLocationPanel ? locationQuery : "");

  useEffect(() => {
    if (!showLocationPanel) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowLocationPanel(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLocationPanel]);

  const handleSelectNominatim = (s: { display_name: string; lat: string; lon: string }) => {
    setMapCenter({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    onLocationQueryChange(s.display_name.split(",")[0]);
    setShowNominatim(false);
  };

  return (
    <div className="hidden md:flex items-center flex-1 max-w-3xl mx-8 relative">
      <div className="flex items-center w-full bg-card border border-border rounded-full shadow-sm hover:shadow-md transition-shadow">
        {/* What — category selector + text search */}
        <div className="flex-1 px-5 py-2 border-r border-border">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">What</label>
          <div className="flex items-center gap-2">
            <Input value={searchQuery} onChange={e => onSearchQueryChange(e.target.value)} onKeyDown={e => e.key === "Enter" && onSearch()}
              placeholder="Service, property…" className="border-0 p-0 h-6 text-sm bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 flex-1" />
            <CategoryQuickSelect active={activeGroup} onChange={onGroupChange} />
          </div>
        </div>

        {/* Where — location with suggestions */}
        <div className="flex-1 px-5 py-2 border-r border-border relative">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Where</label>
          <div className="flex items-center gap-1">
            <Input value={locationQuery}
              onChange={e => { onLocationQueryChange(e.target.value); setShowLocationSuggestions(true); }}
              onFocus={() => setShowLocationSuggestions(true)}
              onKeyDown={e => e.key === "Enter" && onSearch()}
              placeholder={geoCity ? `${geoCity}, ${geoCountry?.toUpperCase()}` : "City, country…"}
              className="border-0 p-0 h-6 text-sm bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 flex-1" />
            {geoCity && !locationQuery && (
              <button onClick={onNearMe} className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors" title="Use my location">
                <LocateFixed className="h-3.5 w-3.5 text-accent" />
              </button>
            )}
          </div>
          <AnimatePresence>
            {showLocationSuggestions && locationSuggestions.length > 0 && !showLocationPanel && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
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

        {/* Radius — opens map panel */}
        <div className="px-4 py-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Radius</label>
          <button onClick={() => setShowLocationPanel(v => !v)}
            className="flex items-center gap-1 h-6 text-sm text-foreground font-medium hover:text-accent transition-colors">
            <Navigation className="h-3.5 w-3.5" />
            {radiusKm === 0 ? "Worldwide" : `${radiusKm} km`}
            <ChevronDown className={`h-3 w-3 transition-transform ${showLocationPanel ? "rotate-180" : ""}`} />
          </button>
        </div>

        <button onClick={onSearch} className="shrink-0 w-10 h-10 mr-1.5 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Map+Radius Panel */}
      <AnimatePresence>
        {showLocationPanel && (
          <motion.div ref={panelRef}
            initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-3 w-[380px] bg-card border border-border rounded-2xl shadow-2xl z-50 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Radar className="h-4 w-4 text-accent" />
                Location & Radius
              </h3>
              <button onClick={() => setShowLocationPanel(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <RadiusMapPanel
              locationQuery={locationQuery} radiusKm={radiusKm}
              geoCity={geoCity} geoCountry={geoCountry} center={mapCenter}
              nominatimResults={nominatimResults} showNominatim={showNominatim || (nominatimResults.length > 0 && locationQuery.length >= 2)}
              onLocationInput={(v) => { onLocationQueryChange(v); setShowNominatim(true); }}
              onSelectNominatim={handleSelectNominatim}
              onRadiusChange={onRadiusKmChange}
              onNearMe={() => { onNearMe(); setShowNominatim(false); }}
              onApply={() => { onSearch(); setShowLocationPanel(false); }}
              onReset={() => { onReset(); setShowLocationPanel(false); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MOBILE SEARCH
   ═══════════════════════════════════════════════════ */
interface MobileSearchProps {
  searchQuery: string;
  locationQuery: string;
  radiusKm: number;
  activeGroup: string;
  geoCity?: string;
  geoCountry?: string;
  geoLat?: number;
  geoLng?: number;
  hasFilters: boolean;
  resultCount: number;
  onSearchQueryChange: (v: string) => void;
  onLocationQueryChange: (v: string) => void;
  onRadiusKmChange: (km: number) => void;
  onGroupChange: (g: string) => void;
  onNearMe: () => void;
  onSearch: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function ExploreMobileSearch({
  searchQuery, locationQuery, radiusKm, activeGroup, geoCity, geoCountry, geoLat, geoLng,
  hasFilters, resultCount,
  onSearchQueryChange, onLocationQueryChange, onRadiusKmChange, onGroupChange,
  onNearMe, onSearch, onClearAll, onClose,
}: MobileSearchProps) {
  const [mapCenter, setMapCenter] = useState({ lat: geoLat || 48.8566, lng: geoLng || 2.3522 });
  const [showNominatim, setShowNominatim] = useState(false);
  const nominatimResults = useNominatimSearch(locationQuery);

  const handleSelectNominatim = (s: { display_name: string; lat: string; lon: string }) => {
    setMapCenter({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    onLocationQueryChange(s.display_name.split(",")[0]);
    setShowNominatim(false);
  };

  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
      className="md:hidden overflow-hidden pb-4">
      <div className="space-y-3">
        {/* What — text search + category */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => onSearchQueryChange(e.target.value)} placeholder="What are you looking for?" className="pl-10 rounded-xl" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <button
              onClick={() => onGroupChange("all")}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeGroup === "all" ? "bg-foreground text-background" : "bg-card border border-border text-muted-foreground"}`}
            >
              All
            </button>
            {CATEGORY_HIERARCHY.map(g => (
              <button
                key={g.value}
                onClick={() => onGroupChange(g.value)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${activeGroup === g.value ? "bg-foreground text-background" : "bg-card border border-border text-muted-foreground"}`}
              >
                {g.emoji} {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Where — map + radius panel */}
        <RadiusMapPanel
          locationQuery={locationQuery} radiusKm={radiusKm}
          geoCity={geoCity} geoCountry={geoCountry} center={mapCenter}
          nominatimResults={nominatimResults} showNominatim={showNominatim || (nominatimResults.length > 0 && locationQuery.length >= 2)}
          onLocationInput={(v) => { onLocationQueryChange(v); setShowNominatim(true); }}
          onSelectNominatim={handleSelectNominatim}
          onRadiusChange={onRadiusKmChange}
          onNearMe={() => { onNearMe(); setShowNominatim(false); }}
          onApply={() => { onSearch(); onClose(); }}
          onReset={onClearAll}
        />
      </div>
    </motion.div>
  );
}
