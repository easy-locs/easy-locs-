import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, X, Search, LocateFixed } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ExploreRadiusSearchProps {
  locationQuery: string;
  radiusKm: number;
  resultCount: number;
  geoCity?: string;
  geoCountry?: string;
  onLocationChange: (v: string) => void;
  onRadiusChange: (km: number) => void;
  onCenterChange?: (lat: number, lng: number) => void;
  onApply: () => void;
  onReset: () => void;
  onNearMe: () => void;
  onClose: () => void;
}

// Default center (Paris) — overridden when user searches
const DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522 };

export function ExploreRadiusSearch({
  locationQuery, radiusKm, resultCount,
  geoCity, geoCountry,
  onLocationChange, onRadiusChange, onCenterChange,
  onApply, onReset, onNearMe, onClose,
}: ExploreRadiusSearchProps) {
  const { t } = useI18n();
  const mapRef = useRef<HTMLDivElement>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Geocode city name → lat/lng via Nominatim
  useEffect(() => {
    if (!locationQuery || locationQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=5&addressdetails=0`
        );
        const data = await res.json();
        setSuggestions(data || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [locationQuery]);

  const selectSuggestion = (s: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setCenter({ lat, lng });
    onLocationChange(s.display_name.split(",")[0]);
    onCenterChange?.(lat, lng);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Calculate zoom level from radius
  const getZoomForRadius = (km: number) => {
    if (km <= 0) return 5;
    if (km <= 5) return 13;
    if (km <= 10) return 12;
    if (km <= 25) return 10;
    if (km <= 50) return 9;
    if (km <= 100) return 8;
    return 7;
  };

  // Build OSM tile URL for static map display
  const zoom = getZoomForRadius(radiusKm);
  const mapTileUrl = `https://tile.openstreetmap.org/${zoom}/${lonToTileX(center.lng, zoom)}/${latToTileY(center.lat, zoom)}.png`;

  // Calculate circle size in pixels based on radius and zoom
  const metersPerPixel = (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const circleDiameterPx = radiusKm > 0 ? Math.min(280, Math.max(40, (radiusKm * 1000 * 2) / metersPerPixel)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4 w-full max-w-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          {t("explore.radius.title") || "Where are you looking?"}
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* City input with autocomplete */}
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={locationQuery}
            onChange={e => { onLocationChange(e.target.value); setShowSuggestions(true); }}
            placeholder={t("explore.radius.placeholder") || "City, country, address..."}
            className="pl-10 rounded-xl h-12 text-base"
          />
        </div>

        {/* Autocomplete suggestions */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden"
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2 border-b border-border/50 last:border-0"
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{s.display_name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected location chip */}
      {locationQuery && radiusKm > 0 && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-sm font-medium text-foreground">
            {locationQuery} - {radiusKm} km
            <button
              onClick={() => { onLocationChange(""); onRadiusChange(0); }}
              className="hover:text-destructive transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* Near me button */}
      {geoCity && !locationQuery && (
        <button
          onClick={onNearMe}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-sm text-accent font-medium hover:bg-accent/15 transition-colors"
        >
          <LocateFixed className="h-4 w-4" />
          {t("explore.radius.my_location") || "My location"} — {geoCity}, {geoCountry?.toUpperCase()}
        </button>
      )}

      {/* Radius slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-foreground">{t("explore.radius.label") || "Search radius"}</label>
          <span className="text-base font-bold text-accent">
            {radiusKm === 0 ? (t("explore.radius.worldwide") || "Worldwide") : `${radiusKm} km`}
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
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 km</span>
          <span>200 km</span>
        </div>
      </div>

      {/* Interactive map with OSM tiles */}
      <div ref={mapRef} className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-border bg-muted">
        {/* OSM tile grid */}
        <MapTiles center={center} zoom={zoom} />

        {/* Radius circle overlay */}
        {radiusKm > 0 && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent/50 pointer-events-none"
            style={{
              width: `${Math.min(90, circleDiameterPx)}%`,
              height: `${Math.min(90, circleDiameterPx)}%`,
              background: "hsl(var(--accent) / 0.12)",
            }}
          />
        )}

        {/* Center pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-4 h-4 rounded-full bg-foreground border-2 border-background shadow-lg" />
        </div>

        {radiusKm === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
            <span className="text-sm text-muted-foreground font-medium">Recherche mondiale</span>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {locationQuery && radiusKm > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground">Suggestions</p>
          <button
            onClick={onApply}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Search className="h-4 w-4" />
            </span>
            {locationQuery} - {radiusKm} km
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button
          variant="outline"
          onClick={onReset}
          className="flex-1 rounded-xl h-12 text-sm font-semibold"
        >
          Effacer
        </Button>
        <Button
          onClick={onApply}
          className="flex-1 rounded-xl h-12 text-sm font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          Valider la localisation ({resultCount.toLocaleString()})
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Map tile helpers ───

function lonToTileX(lon: number, zoom: number) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function latToTileY(lat: number, zoom: number) {
  return Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
}

function tileXToLon(x: number, zoom: number) {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}

function tileYToLat(y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/** Renders a 3x3 grid of OSM tiles centered on the given coordinates */
function MapTiles({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const cx = lonToTileX(center.lng, zoom);
  const cy = latToTileY(center.lat, zoom);

  // Offset within the center tile
  const tileLonLeft = tileXToLon(cx, zoom);
  const tileLonRight = tileXToLon(cx + 1, zoom);
  const tileLatTop = tileYToLat(cy, zoom);
  const tileLatBottom = tileYToLat(cy + 1, zoom);

  const fracX = (center.lng - tileLonLeft) / (tileLonRight - tileLonLeft);
  const fracY = (tileLatTop - center.lat) / (tileLatTop - tileLatBottom);

  const offsetX = -(fracX * 256 + 256 - 0); // center in view
  const offsetY = -(fracY * 256 + 256 - 0);

  const tiles: Array<{ x: number; y: number }> = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tiles.push({ x: cx + dx, y: cy + dy });
    }
  }

  return (
    <div
      className="absolute"
      style={{
        width: 256 * 3,
        height: 256 * 3,
        left: `calc(50% + ${offsetX}px)`,
        top: `calc(50% + ${offsetY}px)`,
      }}
    >
      {tiles.map((tile, i) => (
        <img
          key={`${tile.x}-${tile.y}-${zoom}`}
          src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
          alt=""
          className="absolute"
          style={{
            width: 256,
            height: 256,
            left: (tile.x - cx + 1) * 256,
            top: (tile.y - cy + 1) * 256,
          }}
          loading="eager"
          crossOrigin="anonymous"
        />
      ))}
    </div>
  );
}
