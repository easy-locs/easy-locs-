import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, X, Search, LocateFixed, Zap, Globe, Navigation } from "lucide-react";
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

const DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522 };

const QUICK_RADIUS = [
  { km: 5, label: "5 km", emoji: "📍" },
  { km: 15, label: "15 km", emoji: "🏘️" },
  { km: 50, label: "50 km", emoji: "🌆" },
  { km: 100, label: "100 km", emoji: "🗺️" },
  { km: 0, label: "Worldwide", emoji: "🌍" },
];

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

  const getZoomForRadius = (km: number) => {
    if (km <= 0) return 5;
    if (km <= 5) return 13;
    if (km <= 10) return 12;
    if (km <= 25) return 10;
    if (km <= 50) return 9;
    if (km <= 100) return 8;
    return 7;
  };

  const zoom = getZoomForRadius(radiusKm);
  const metersPerPixel = (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const circleDiameterPx = radiusKm > 0 ? Math.min(280, Math.max(40, (radiusKm * 1000 * 2) / metersPerPixel)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.25 }}
      className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
    >
      {/* ── Premium header ── */}
      <div className="relative px-5 pt-5 pb-4"
        style={{ background: "linear-gradient(135deg, hsl(var(--accent) / 0.06), hsl(var(--accent) / 0.02))" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-accent/15 flex items-center justify-center">
              <Navigation className="h-4 w-4 text-accent" />
            </div>
            {t("explore.radius.title") || "Where are you looking?"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* City input */}
        <div className="relative">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={locationQuery}
              onChange={e => { onLocationChange(e.target.value); setShowSuggestions(true); }}
              placeholder={t("explore.radius.placeholder") || "City, country, address..."}
              className="pl-10 rounded-xl h-12 text-base border-accent/20 focus:border-accent/50"
            />
          </div>
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
                    className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-accent/5 transition-colors flex items-center gap-2 border-b border-border/50 last:border-0"
                  >
                    <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="truncate">{s.display_name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* ── Near me CTA ── */}
        {geoCity && !locationQuery && (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onNearMe}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-accent/20 text-sm font-medium hover:border-accent/40 hover:bg-accent/5 transition-all group"
          >
            <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
              <LocateFixed className="h-4 w-4 text-accent" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">{t("explore.radius.my_location") || "My location"}</p>
              <p className="text-xs text-muted-foreground">{geoCity}, {geoCountry?.toUpperCase()}</p>
            </div>
            <Zap className="h-4 w-4 text-accent ml-auto" />
          </motion.button>
        )}

        {/* ── Quick radius chips ── */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("explore.radius.quick") || "Quick select"}</label>
          <div className="flex gap-2 flex-wrap">
            {QUICK_RADIUS.map(q => (
              <button
                key={q.km}
                onClick={() => onRadiusChange(q.km)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  radiusKm === q.km
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:border-accent/30 hover:text-foreground"
                }`}
              >
                <span>{q.emoji}</span>
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Precision slider ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-foreground">{t("explore.radius.label") || "Precision"}</label>
            <motion.span
              key={radiusKm}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-lg font-bold text-accent tabular-nums"
            >
              {radiusKm === 0 ? (
                <span className="flex items-center gap-1.5 text-base">
                  <Globe className="h-4 w-4" />
                  {t("explore.radius.worldwide") || "Worldwide"}
                </span>
              ) : (
                `${radiusKm} km`
              )}
            </motion.span>
          </div>
          <Slider
            value={[radiusKm]}
            onValueChange={([v]) => onRadiusChange(v)}
            min={0}
            max={200}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
            <span>📍 0 km</span>
            <span>50</span>
            <span>100</span>
            <span>🌍 200 km</span>
          </div>
        </div>

        {/* ── Interactive map ── */}
        <div ref={mapRef} className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border border-border bg-muted">
          <MapTiles center={center} zoom={zoom} />

          {/* Animated radius circle */}
          {radiusKm > 0 && (
            <motion.div
              key={radiusKm}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                width: `${Math.min(90, circleDiameterPx)}%`,
                height: `${Math.min(90, circleDiameterPx)}%`,
                background: "radial-gradient(circle, hsl(var(--accent) / 0.15), hsl(var(--accent) / 0.05))",
                border: "2px solid hsl(var(--accent) / 0.4)",
                boxShadow: "0 0 20px hsl(var(--accent) / 0.1), inset 0 0 20px hsl(var(--accent) / 0.05)",
              }}
            />
          )}

          {/* Center pin with pulse */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-accent border-2 border-background shadow-lg" />
              <div className="absolute inset-0 rounded-full bg-accent/30 animate-ping" />
            </div>
          </div>

          {/* Worldwide overlay */}
          {radiusKm === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
              <div className="text-center">
                <Globe className="h-8 w-8 text-accent/40 mx-auto mb-1" />
                <span className="text-xs text-muted-foreground font-medium">{t("explore.radius.worldwide_search") || "Worldwide search"}</span>
              </div>
            </div>
          )}

          {/* Live result count badge */}
          {radiusKm > 0 && locationQuery && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-2 right-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1 text-xs font-bold text-foreground shadow-sm"
            >
              {resultCount} {resultCount === 1 ? "result" : "results"}
            </motion.div>
          )}
        </div>

        {/* ── Selected location chip ── */}
        {locationQuery && radiusKm > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-accent/5 border border-accent/15 rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-4 w-4 text-accent shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">{locationQuery}</span>
              <span className="text-xs text-muted-foreground">· {radiusKm} km</span>
            </div>
            <button
              onClick={() => { onLocationChange(""); onRadiusChange(0); }}
              className="p-1 rounded-md hover:bg-destructive/10 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </motion.div>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            onClick={onReset}
            className="flex-1 rounded-xl h-12 text-sm font-semibold"
          >
            {t("explore.radius.reset") || "Reset"}
          </Button>
          <Button
            onClick={onApply}
            className="flex-1 rounded-xl h-12 text-sm font-bold bg-accent hover:bg-accent/90 text-accent-foreground gap-2 shadow-md hover:shadow-lg transition-shadow"
          >
            <Search className="h-4 w-4" />
            {t("explore.radius.apply") || "Apply"}
            {resultCount > 0 && locationQuery && (
              <span className="bg-accent-foreground/20 px-1.5 py-0.5 rounded-md text-[10px] tabular-nums">{resultCount}</span>
            )}
          </Button>
        </div>
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
      {tiles.map((tile) => (
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
