import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, Phone, Globe, Clock, Loader2, AlertTriangle,
  ExternalLink, List, Map as MapIcon, Filter, RefreshCw,
  ChevronDown, ChevronUp, Search, Heart,
} from "lucide-react";
import { haversineKm } from "@/lib/geo/distance";
import { getGPSOrFallback } from "@/data/islamic/fallback-coords";
import { useInAppNavigation } from "@/stores/useInAppNavigation";
import { useI18n } from "@/lib/i18n";

const NAVY = "hsl(226 22% 14%)";
const GOLD = "hsl(var(--accent))";
const LS_MOSQUE_FAVS_KEY = "islamic_mosque_favorites";

type PlaceType = "mosque" | "halal";

interface IslamicPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: PlaceType;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  distance?: number;
  cuisine?: string;
  diet?: string;
  wheelchair?: string;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const RADIUS_OPTIONS = [1000, 2000, 5000, 10000];

function buildMosqueQuery(lat: number, lng: number, radiusM: number): string {
  return `
[out:json][timeout:15];
(
  node["amenity"="mosque"](around:${radiusM},${lat},${lng});
  way["amenity"="mosque"](around:${radiusM},${lat},${lng});
  relation["amenity"="mosque"](around:${radiusM},${lat},${lng});
  node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng});
  node["amenity"="place_of_worship"]["religion"="islam"](around:${radiusM},${lat},${lng});
  way["amenity"="place_of_worship"]["religion"="islam"](around:${radiusM},${lat},${lng});
);
out body center 100;
`.trim();
}

function buildHalalQuery(lat: number, lng: number, radiusM: number): string {
  return `
[out:json][timeout:15];
(
  node["amenity"~"restaurant|cafe|fast_food"]["diet:halal"="yes"](around:${radiusM},${lat},${lng});
  way["amenity"~"restaurant|cafe|fast_food"]["diet:halal"="yes"](around:${radiusM},${lat},${lng});
  node["amenity"~"restaurant|cafe|fast_food"]["cuisine"~"halal"](around:${radiusM},${lat},${lng});
  way["amenity"~"restaurant|cafe|fast_food"]["cuisine"~"halal"](around:${radiusM},${lat},${lng});
  node["shop"~"butcher|supermarket"]["diet:halal"="yes"](around:${radiusM},${lat},${lng});
  way["shop"~"butcher|supermarket"]["diet:halal"="yes"](around:${radiusM},${lat},${lng});
);
out body center 100;
`.trim();
}

async function fetchOverpass(query: string, signal?: AbortSignal): Promise<any | null> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const combinedSignal = signal;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: combinedSignal ?? controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      return await res.json();
    } catch {
      continue;
    }
  }
  return null;
}

function parseElements(elements: any[], lat: number, lng: number, type: PlaceType, fallbackName: string): IslamicPlace[] {
  return elements
    .filter((el: any) => (el.lat || el.center?.lat) && (el.lon || el.center?.lon))
    .map((el: any) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      const tags = el.tags ?? {};
      return {
        id: `osm-${el.type?.[0] ?? "n"}-${el.id}`,
        name: tags.name || tags["name:en"] || tags["name:ar"] || fallbackName,
        lat: elLat,
        lng: elLon,
        type,
        address: [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join(", ") || undefined,
        phone: tags.phone || tags["contact:phone"] || undefined,
        website: tags.website || tags["contact:website"] || undefined,
        openingHours: tags.opening_hours || undefined,
        distance: haversineKm(lat, lng, elLat, elLon),
        cuisine: tags.cuisine || undefined,
        diet: tags["diet:halal"] || undefined,
        wheelchair: tags.wheelchair || undefined,
      };
    })
    .sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99));
}

function formatDistance(km?: number): string {
  if (!km) return "";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function openExternalMap(lat: number, lng: number, name: string) {
  const encoded = encodeURIComponent(name);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&q=${encoded}`, "_blank");
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encoded}`, "_blank");
  }
}

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_MOSQUE_FAVS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveFavorites(favs: Set<string>): void {
  try {
    localStorage.setItem(LS_MOSQUE_FAVS_KEY, JSON.stringify([...favs]));
  } catch {}
}

function PlaceCard({
  place,
  expanded,
  onToggle,
  onNavigate,
  isFavorite,
  onToggleFavorite,
  t,
}: {
  place: IslamicPlace;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (lat: number, lng: number, label: string) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  t: (key: string) => string;
}) {
  const isMosque = place.type === "mosque";
  return (
    <motion.div
      layout
      className="rounded-xl overflow-hidden"
      style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}22` }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-3 flex items-start gap-3"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
          style={{ background: `${GOLD}18` }}
        >
          {isMosque ? "🕌" : "🥙"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate" style={{ color: GOLD }}>
            {place.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            {place.distance != null && (
              <span className="text-[11px] font-medium" style={{ color: `${GOLD}aa` }}>
                {formatDistance(place.distance)}
              </span>
            )}
            {place.address && (
              <span className="text-[11px] truncate" style={{ color: `${GOLD}66` }}>
                {place.address}
              </span>
            )}
          </div>
          {place.cuisine && (
            <span className="text-[10px] mt-0.5 block" style={{ color: `${GOLD}88` }}>
              {place.cuisine}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="shrink-0 mt-1 p-1 rounded-lg"
          style={{ background: isFavorite ? `${GOLD}22` : "transparent" }}
          aria-label={isFavorite ? t("islamic.remove_from_favorites") : t("islamic.add_to_favorites")}
        >
          <Heart size={15} fill={isFavorite ? GOLD : "none"} style={{ color: isFavorite ? GOLD : `${GOLD}44` }} />
        </button>
        <div className="shrink-0 mt-1">
          {expanded ? (
            <ChevronUp size={16} style={{ color: `${GOLD}66` }} />
          ) : (
            <ChevronDown size={16} style={{ color: `${GOLD}66` }} />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2" style={{ borderTop: `1px solid ${GOLD}15` }}>
              <div className="pt-2">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${place.lng - 0.003},${place.lat - 0.002},${place.lng + 0.003},${place.lat + 0.002}&layer=mapnik&marker=${place.lat},${place.lng}`}
                  className="w-full rounded-lg border-0"
                  style={{ height: 140 }}
                  title={`${t("islamic.map")}: ${place.name}`}
                  loading="lazy"
                />
              </div>

              <div className="space-y-1.5">
                {place.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={13} style={{ color: `${GOLD}88` }} />
                    <span className="text-xs" style={{ color: `${GOLD}cc` }}>{place.address}</span>
                  </div>
                )}
                {place.phone && (
                  <a href={`tel:${place.phone}`} className="flex items-center gap-2">
                    <Phone size={13} style={{ color: `${GOLD}88` }} />
                    <span className="text-xs underline" style={{ color: `${GOLD}cc` }}>{place.phone}</span>
                  </a>
                )}
                {place.website && (
                  <a href={place.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <Globe size={13} style={{ color: `${GOLD}88` }} />
                    <span className="text-xs underline truncate" style={{ color: `${GOLD}cc` }}>
                      {place.website.replace(/^https?:\/\//, "").slice(0, 40)}
                    </span>
                  </a>
                )}
                {place.openingHours && (
                  <div className="flex items-center gap-2">
                    <Clock size={13} style={{ color: `${GOLD}88` }} />
                    <span className="text-xs" style={{ color: `${GOLD}cc` }}>{place.openingHours}</span>
                  </div>
                )}
                {place.wheelchair && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: `${GOLD}88` }}>♿</span>
                    <span className="text-xs capitalize" style={{ color: `${GOLD}cc` }}>{place.wheelchair}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onNavigate(place.lat, place.lng, place.name)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: GOLD, color: NAVY }}
                >
                  <Navigation size={13} />
                  {t("islamic.directions")}
                </button>
                <button
                  onClick={() => openExternalMap(place.lat, place.lng, place.name)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: `${GOLD}18`, color: GOLD }}
                >
                  <ExternalLink size={13} />
                  {t("islamic.external_map")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MosquesTab({ country }: { country: string }) {
  const { t } = useI18n();
  const [places, setPlaces] = useState<IslamicPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mosque" | "halal">("all");
  const [radiusM, setRadiusM] = useState(5000);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsSource, setGpsSource] = useState<"gps" | "fallback">("fallback");
  const abortRef = useRef<AbortController | null>(null);
  const [showRadiusMenu, setShowRadiusMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const { openNavigation } = useInAppNavigation();

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const handleNavigate = useCallback((lat: number, lng: number, label: string) => {
    openNavigation({ lat, lng, label, mode: "walking" });
  }, [openNavigation]);

  const fetchPlacesRef = useRef<(lat: number, lng: number, radius: number) => Promise<void>>();

  const fetchPlaces = useCallback(async (lat: number, lng: number, radius: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const [mosqueJson, halalJson] = await Promise.all([
        fetchOverpass(buildMosqueQuery(lat, lng, radius), controller.signal),
        fetchOverpass(buildHalalQuery(lat, lng, radius), controller.signal),
      ]);

      if (controller.signal.aborted) return;

      const mosques = mosqueJson?.elements
        ? parseElements(mosqueJson.elements, lat, lng, "mosque", t("islamic.mosque"))
        : [];
      const halal = halalJson?.elements
        ? parseElements(halalJson.elements, lat, lng, "halal", t("islamic.halal_restaurant"))
        : [];

      const all = [...mosques, ...halal].sort(
        (a, b) => (a.distance ?? 99) - (b.distance ?? 99)
      );

      const deduped = Array.from(
        new Map(all.map((p) => [`${p.lat.toFixed(5)}_${p.lng.toFixed(5)}_${p.name}`, p])).values()
      );

      setPlaces(deduped);
      if (deduped.length === 0 && radius < 10000) {
        const nextRadius = Math.min(radius * 2, 10000);
        setRadiusM(nextRadius);
        fetchPlacesRef.current?.(lat, lng, nextRadius);
        return;
      }
      if (deduped.length === 0) {
        setError(t("islamic.no_places_found"));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(t("islamic.loading_error"));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [t]);

  fetchPlacesRef.current = fetchPlaces;

  useEffect(() => {
    let cancelled = false;
    getGPSOrFallback(country).then((result) => {
      if (cancelled) return;
      setCoords({ lat: result.lat, lng: result.lng });
      setGpsSource(result.source);
      fetchPlaces(result.lat, result.lng, radiusM);
    });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [country, fetchPlaces, radiusM]);

  const handleRadiusChange = (r: number) => {
    setRadiusM(r);
    setShowRadiusMenu(false);
    if (coords) fetchPlaces(coords.lat, coords.lng, r);
  };

  const searchLower = searchQuery.trim().toLowerCase();
  const filtered = places.filter((p) => {
    if (filter !== "all" && p.type !== filter) return false;
    if (searchLower && !p.name.toLowerCase().includes(searchLower) && !(p.address?.toLowerCase().includes(searchLower))) return false;
    return true;
  });

  const mosqueCount = places.filter((p) => p.type === "mosque").length;
  const halalCount = places.filter((p) => p.type === "halal").length;

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold" style={{ color: GOLD }}>
          🕌 {t("islamic.mosques_and_halal")}
        </h2>
        <p className="text-xs" style={{ color: `${GOLD}88` }}>
          {gpsSource === "gps" ? `📍 ${t("islamic.gps_position")}` : `📍 ${t("islamic.approximate_position")}`} · {t("islamic.radius")}: {radiusM >= 1000 ? `${radiusM / 1000} km` : `${radiusM} m`}
        </p>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: `${GOLD}55` }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("islamic.search_by_name_or_address")}
          className="w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}22`, color: GOLD }}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {(["all", "mosque", "halal"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all"
              style={{
                background: filter === f ? GOLD : `${GOLD}12`,
                color: filter === f ? NAVY : `${GOLD}cc`,
                border: filter === f ? "none" : `1px solid ${GOLD}22`,
              }}
            >
              {f === "all" && `${t("islamic.all")} (${places.length})`}
              {f === "mosque" && `🕌 ${t("islamic.tab.mosques")} (${mosqueCount})`}
              {f === "halal" && `🥙 Halal (${halalCount})`}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowRadiusMenu(!showRadiusMenu)}
            className="p-2 rounded-lg"
            style={{ background: `${GOLD}12`, color: GOLD }}
            title={t("islamic.change_radius")}
          >
            <Filter size={16} />
          </button>
          {showRadiusMenu && (
            <div
              className="absolute right-0 top-full mt-1 z-20 rounded-lg shadow-lg p-1 min-w-[120px]"
              style={{ background: NAVY, border: `1px solid ${GOLD}33` }}
            >
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => handleRadiusChange(r)}
                  className="w-full text-left px-3 py-1.5 rounded text-xs font-medium"
                  style={{
                    color: r === radiusM ? NAVY : `${GOLD}cc`,
                    background: r === radiusM ? GOLD : "transparent",
                  }}
                >
                  {r >= 1000 ? `${r / 1000} km` : `${r} m`}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
          className="p-2 rounded-lg"
          style={{ background: `${GOLD}12`, color: GOLD }}
          title={viewMode === "list" ? t("islamic.map_view") : t("islamic.list_view")}
        >
          {viewMode === "list" ? <MapIcon size={16} /> : <List size={16} />}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: GOLD }} />
          <p className="text-xs" style={{ color: `${GOLD}88` }}>{t("islamic.searching")}</p>
        </div>
      )}

      {error && !loading && (
        <div
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}22` }}
        >
          <AlertTriangle size={18} style={{ color: GOLD }} />
          <p className="text-xs flex-1" style={{ color: `${GOLD}aa` }}>{error}</p>
          {coords && (
            <button
              onClick={() => fetchPlaces(coords.lat, coords.lng, radiusM)}
              className="shrink-0 p-1.5 rounded-lg"
              style={{ background: `${GOLD}18`, color: GOLD }}
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      )}

      {!loading && !error && viewMode === "map" && coords && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}22` }}>
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - (radiusM / 80000)},${coords.lat - (radiusM / 111000)},${coords.lng + (radiusM / 80000)},${coords.lat + (radiusM / 111000)}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
            className="w-full border-0"
            style={{ height: 280 }}
            title={t("islamic.mosque_map")}
            loading="lazy"
          />
          <div className="px-3 py-2" style={{ background: `${GOLD}08` }}>
            <p className="text-[10px] text-center" style={{ color: `${GOLD}88` }}>
              {t("islamic.places_found", { count: String(filtered.length) })}
            </p>
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              expanded={expandedId === place.id}
              onToggle={() =>
                setExpandedId(expandedId === place.id ? null : place.id)
              }
              onNavigate={handleNavigate}
              isFavorite={favorites.has(place.id)}
              onToggleFavorite={() => toggleFavorite(place.id)}
              t={t}
            />
          ))}
        </div>
      )}

      {!loading && searchQuery && filtered.length === 0 && places.length > 0 && (
        <div className="text-center py-6">
          <p className="text-xs" style={{ color: `${GOLD}88` }}>
            {t("islamic.no_results_for")} "{searchQuery}"
          </p>
        </div>
      )}
    </div>
  );
}
