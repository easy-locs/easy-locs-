import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Search, MapPin, Globe, X, ChevronDown,
  LocateFixed, Radar, Navigation, Layers, Minus, Plus, Crosshair,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_HIERARCHY } from "@/lib/taxonomy/category-tree";

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

/* ═══════════════════════════════════════════════════════
   HD INTERACTIVE MAP — Full-resolution tile map with
   drag, zoom, precise radius circle, and retina support
   ═══════════════════════════════════════════════════════ */

const TILE_SIZE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 18;

function lngToX(lng: number, z: number) { return ((lng + 180) / 360) * Math.pow(2, z) * TILE_SIZE; }
function latToY(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z) * TILE_SIZE;
}
function xToLng(x: number, z: number) { return (x / (Math.pow(2, z) * TILE_SIZE)) * 360 - 180; }
function yToLat(y: number, z: number) {
  const n = Math.PI - (2 * Math.PI * y) / (Math.pow(2, z) * TILE_SIZE);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function getZoomForRadius(km: number): number {
  if (km <= 0) return 5;
  if (km <= 2) return 14;
  if (km <= 5) return 13;
  if (km <= 10) return 12;
  if (km <= 25) return 10;
  if (km <= 50) return 9;
  if (km <= 100) return 8;
  if (km <= 200) return 7;
  return 6;
}

/** meters per pixel at given lat and zoom */
function metersPerPx(lat: number, zoom: number) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

interface HDMapProps {
  center: { lat: number; lng: number };
  radiusKm: number;
  onCenterChange?: (c: { lat: number; lng: number }) => void;
  onZoomChange?: (z: number) => void;
  className?: string;
  interactive?: boolean;
  initialZoom?: number;
}

function HDInteractiveMap({ center, radiusKm, onCenterChange, onZoomChange, className = "", interactive = true, initialZoom }: HDMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 400, h: 250 });
  const [zoom, setZoom] = useState(initialZoom ?? getZoomForRadius(radiusKm));
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startOx: number; startOy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Auto-zoom when radius changes (only if not manually zooming)
  const lastRadiusRef = useRef(radiusKm);
  useEffect(() => {
    if (lastRadiusRef.current !== radiusKm) {
      lastRadiusRef.current = radiusKm;
      const z = getZoomForRadius(radiusKm);
      setZoom(z);
      setOffset({ x: 0, y: 0 });
    }
  }, [radiusKm]);

  // Reset offset when center changes
  const lastCenterRef = useRef(center);
  useEffect(() => {
    if (lastCenterRef.current.lat !== center.lat || lastCenterRef.current.lng !== center.lng) {
      lastCenterRef.current = center;
      setOffset({ x: 0, y: 0 });
    }
  }, [center]);

  // Observe container size for responsive rendering
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ w: Math.round(width), h: Math.round(height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Compute center pixel + visible tile range
  const centerPx = useMemo(() => ({
    x: lngToX(center.lng, zoom) + offset.x,
    y: latToY(center.lat, zoom) + offset.y,
  }), [center, zoom, offset]);

  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const useTileSize = TILE_SIZE; // CSS tile size
  const tileServer = dpr > 1
    ? "https://tile.openstreetmap.org" // no 2x tiles available for OSM, but we render at scale
    : "https://tile.openstreetmap.org";

  const tiles = useMemo(() => {
    const halfW = size.w / 2;
    const halfH = size.h / 2;
    const topLeftX = centerPx.x - halfW;
    const topLeftY = centerPx.y - halfH;
    const startTileX = Math.floor(topLeftX / useTileSize);
    const startTileY = Math.floor(topLeftY / useTileSize);
    const endTileX = Math.ceil((centerPx.x + halfW) / useTileSize);
    const endTileY = Math.ceil((centerPx.y + halfH) / useTileSize);
    const maxTile = Math.pow(2, zoom) - 1;
    const result: Array<{ tx: number; ty: number; x: number; y: number; key: string }> = [];
    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const wrappedTx = ((tx % (maxTile + 1)) + (maxTile + 1)) % (maxTile + 1);
        if (ty < 0 || ty > maxTile) continue;
        const px = tx * useTileSize - topLeftX;
        const py = ty * useTileSize - topLeftY;
        result.push({ tx: wrappedTx, ty, x: px, y: py, key: `${zoom}-${wrappedTx}-${ty}-${tx}` });
      }
    }
    return result;
  }, [centerPx, size, zoom, useTileSize]);

  // Radius circle size in pixels
  const mpp = metersPerPx(center.lat, zoom);
  const radiusPx = radiusKm > 0 ? (radiusKm * 1000) / mpp : 0;
  const circleDiameter = radiusPx * 2;

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOx: offset.x, startOy: offset.y };
    setDragging(true);
  }, [interactive, offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.startOx - dx, y: dragRef.current.startOy - dy });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    // If dragged significantly, update center
    if ((Math.abs(dx) > 5 || Math.abs(dy) > 5) && onCenterChange) {
      const newCenterPxX = lngToX(center.lng, zoom) + offset.x;
      const newCenterPxY = latToY(center.lat, zoom) + offset.y;
      const newLng = xToLng(newCenterPxX - dx, zoom);
      const newLat = yToLat(newCenterPxY - dy, zoom);
      // Clamp
      const clampedLat = Math.max(-85, Math.min(85, newLat));
      onCenterChange({ lat: clampedLat, lng: newLng });
    }
    dragRef.current = null;
    setDragging(false);
    setOffset({ x: 0, y: 0 });
  }, [center, zoom, offset, onCenterChange]);

  // Zoom with wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!interactive) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    setZoom(z => {
      const newZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta));
      onZoomChange?.(newZ);
      return newZ;
    });
    setOffset({ x: 0, y: 0 });
  }, [interactive, onZoomChange]);

  const zoomIn = () => { setZoom(z => Math.min(MAX_ZOOM, z + 1)); setOffset({ x: 0, y: 0 }); };
  const zoomOut = () => { setZoom(z => Math.max(MIN_ZOOM, z - 1)); setOffset({ x: 0, y: 0 }); };
  const recenter = () => { setOffset({ x: 0, y: 0 }); setZoom(getZoomForRadius(radiusKm)); };

  return (
    <div ref={containerRef} className={`relative overflow-hidden select-none ${className}`}
      style={{ cursor: dragging ? "grabbing" : interactive ? "grab" : "default", touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Tiles */}
      {tiles.map(t => (
        <img
          key={t.key}
          src={`${tileServer}/${zoom}/${t.tx}/${t.ty}.png`}
          alt=""
          className="absolute pointer-events-none"
          style={{ left: t.x, top: t.y, width: useTileSize, height: useTileSize, imageRendering: "auto" }}
          loading="eager"
          draggable={false}
          crossOrigin="anonymous"
        />
      ))}

      {/* Radius circle — precise, animated */}
      {radiusKm > 0 && (
        <div
          className="absolute rounded-full pointer-events-none transition-all duration-300 ease-out"
          style={{
            width: circleDiameter,
            height: circleDiameter,
            left: size.w / 2 - radiusPx,
            top: size.h / 2 - radiusPx,
            border: "2px solid hsl(var(--accent) / 0.7)",
            background: "radial-gradient(circle, hsl(var(--accent) / 0.12) 0%, hsl(var(--accent) / 0.04) 70%, transparent 100%)",
            boxShadow: "0 0 20px hsl(var(--accent) / 0.15), inset 0 0 30px hsl(var(--accent) / 0.05)",
          }}
        />
      )}

      {/* Center pin */}
      <div className="absolute z-10 pointer-events-none" style={{ left: size.w / 2, top: size.h / 2, transform: "translate(-50%, -50%)" }}>
        <div className="relative">
          <div className="w-5 h-5 rounded-full bg-accent border-[2.5px] border-background shadow-lg shadow-accent/30" />
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent/50 animate-ping" />
        </div>
      </div>

      {/* Worldwide overlay */}
      {radiusKm === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40 backdrop-blur-[1px] pointer-events-none">
          <span className="text-xs text-muted-foreground font-semibold px-4 py-2 bg-background/90 rounded-full border border-border shadow-sm">
            🌍 Worldwide — set radius to focus
          </span>
        </div>
      )}

      {/* Location + radius badge */}
      {radiusKm > 0 && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-center pointer-events-none z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/95 border border-border text-[11px] font-semibold text-foreground shadow-md backdrop-blur-md">
            <Crosshair className="h-3 w-3 text-accent" />
            {radiusKm} km radius
          </span>
        </div>
      )}

      {/* Zoom controls */}
      {interactive && (
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 z-10">
          <button onClick={(e) => { e.stopPropagation(); zoomIn(); }}
            className="w-7 h-7 rounded-lg bg-background/95 border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors">
            <Plus className="h-3.5 w-3.5 text-foreground" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); zoomOut(); }}
            className="w-7 h-7 rounded-lg bg-background/95 border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors">
            <Minus className="h-3.5 w-3.5 text-foreground" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); recenter(); }}
            className="w-7 h-7 rounded-lg bg-background/95 border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors mt-1"
            title="Reset view">
            <Crosshair className="h-3.5 w-3.5 text-accent" />
          </button>
        </div>
      )}

      {/* OSM attribution */}
      <div className="absolute bottom-0.5 right-1 text-[8px] text-muted-foreground/60 pointer-events-none z-10">
        © OpenStreetMap
      </div>
    </div>
  );
}

/* ─── Nominatim autocomplete hook (debounced) ─── */
function useNominatimSearch(query: string) {
  const [results, setResults] = useState<Array<{ display_name: string; lat: string; lon: string; type: string }>>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
          { signal: AbortSignal.timeout(5000) }
        );
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  return results;
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
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0 px-2 py-1 rounded-lg hover:bg-muted">
        <Layers className="h-3 w-3" />
        <span className="max-w-[80px] truncate">{activeLabel}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-52 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden py-1">
            <button onClick={() => { onChange("all"); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors ${active === "all" ? "text-accent font-semibold" : "text-foreground"}`}>
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

/* ─── Inline map panel (shared between desktop & mobile) ─── */
function RadiusMapPanel({
  locationQuery, radiusKm,
  geoCity, geoCountry, center,
  nominatimResults, showNominatim,
  onLocationInput, onSelectNominatim,
  onRadiusChange, onCenterChange, onNearMe, onApply, onReset,
}: {
  locationQuery: string; radiusKm: number;
  geoCity?: string; geoCountry?: string;
  center: { lat: number; lng: number };
  nominatimResults: Array<{ display_name: string; lat: string; lon: string; type: string }>;
  showNominatim: boolean;
  onLocationInput: (v: string) => void;
  onSelectNominatim: (s: { display_name: string; lat: string; lon: string }) => void;
  onRadiusChange: (km: number) => void;
  onCenterChange?: (c: { lat: number; lng: number }) => void;
  onNearMe: () => void;
  onApply: () => void;
  onReset: () => void;
}) {
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
              className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden max-h-52 overflow-y-auto">
              {nominatimResults.map((s, i) => (
                <button key={i} onClick={() => onSelectNominatim(s)}
                  className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2 border-b border-border/30 last:border-0">
                  <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
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

      {/* HD Interactive Map */}
      <HDInteractiveMap
        center={center}
        radiusKm={radiusKm}
        onCenterChange={onCenterChange}
        className="w-full aspect-[16/10] rounded-xl border border-border"
        interactive
      />

      {/* Radius slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Radar className="h-3.5 w-3.5 text-accent" />
            Search radius
          </span>
          <span className="text-sm font-bold text-accent tabular-nums">
            {radiusKm === 0 ? "Worldwide" : `${radiusKm} km`}
          </span>
        </div>
        <Slider
          value={[radiusKm]}
          onValueChange={([v]) => onRadiusChange(v)}
          min={0} max={200} step={5}
          className="w-full"
        />
        <div className="flex justify-between px-0.5">
          {RADIUS_STEPS.map(v => (
            <button key={v} onClick={() => onRadiusChange(v)}
              className={`text-[10px] font-semibold transition-colors ${radiusKm === v ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}>
              {v === 0 ? "🌍" : `${v}`}
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

  // Sync map center when geo changes
  useEffect(() => {
    if (geoLat && geoLng) setMapCenter({ lat: geoLat, lng: geoLng });
  }, [geoLat, geoLng]);

  useEffect(() => {
    if (!showLocationPanel) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowLocationPanel(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLocationPanel]);

  const handleSelectNominatim = (s: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setMapCenter({ lat, lng });
    onLocationQueryChange(s.display_name.split(",")[0].trim());
    setShowNominatim(false);
    // Auto-set radius if not set
    if (radiusKm === 0) onRadiusKmChange(25);
  };

  const handleMapCenterChange = (c: { lat: number; lng: number }) => {
    setMapCenter(c);
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
            className="absolute top-full right-0 mt-3 w-[420px] bg-card border border-border rounded-2xl shadow-2xl z-50 p-5">
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
              onCenterChange={handleMapCenterChange}
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

  useEffect(() => {
    if (geoLat && geoLng) setMapCenter({ lat: geoLat, lng: geoLng });
  }, [geoLat, geoLng]);

  const handleSelectNominatim = (s: { display_name: string; lat: string; lon: string }) => {
    setMapCenter({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    onLocationQueryChange(s.display_name.split(",")[0].trim());
    setShowNominatim(false);
    if (radiusKm === 0) onRadiusKmChange(25);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className="md:hidden overflow-hidden border-t border-border bg-card"
    >
      <div className="px-4 py-4 space-y-4">
        {/* Text search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => onSearchQueryChange(e.target.value)}
            placeholder="Search services, properties…" className="pl-10 rounded-xl h-11 text-sm" />
          {searchQuery && (
            <button onClick={() => onSearchQueryChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <button onClick={() => onGroupChange("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeGroup === "all" ? "bg-foreground text-background" : "bg-card border border-border text-muted-foreground"}`}>
            All
          </button>
          {CATEGORY_HIERARCHY.map(g => (
            <button key={g.value} onClick={() => onGroupChange(g.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${activeGroup === g.value ? "bg-foreground text-background" : "bg-card border border-border text-muted-foreground"}`}>
              {g.emoji} {g.label}
            </button>
          ))}
        </div>

        {/* Where — map + radius panel */}
        <RadiusMapPanel
          locationQuery={locationQuery} radiusKm={radiusKm}
          geoCity={geoCity} geoCountry={geoCountry} center={mapCenter}
          nominatimResults={nominatimResults} showNominatim={showNominatim || (nominatimResults.length > 0 && locationQuery.length >= 2)}
          onLocationInput={(v) => { onLocationQueryChange(v); setShowNominatim(true); }}
          onSelectNominatim={handleSelectNominatim}
          onRadiusChange={onRadiusKmChange}
          onCenterChange={setMapCenter}
          onNearMe={() => { onNearMe(); setShowNominatim(false); }}
          onApply={() => { onSearch(); onClose(); }}
          onReset={onClearAll}
        />
      </div>
    </motion.div>
  );
}
