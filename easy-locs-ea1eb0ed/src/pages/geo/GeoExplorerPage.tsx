import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, ChevronRight, MapPin, Clock, DollarSign,
  Languages, Cloud, TrendingUp, Users, Building2,
  Zap, ShieldCheck, Store, Bus, Sun, AlertTriangle,
  Radio, ExternalLink, Map as MapIcon,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCountryByCode, COUNTRIES } from "@/lib/data/countries";
import {
  getAllCountryProfiles,
  getCityProfilesForCountry,
} from "@/lib/intelligence/global/country-profile-registry";
import { openMeteoProvider } from "@/lib/intelligence/global/weather-provider-openmeteo";
import { frankfurterProvider } from "@/lib/intelligence/global/forex-provider-frankfurter";
import { composeTicker, getCurrentTickerItem } from "@/lib/intelligence/global/ticker-engine";
import type { TickerState } from "@/lib/intelligence/global/ticker-engine";
import { useGeoStore } from "@/lib/geo/geo-store";
import type { CountryProfile, CityProfile, CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

interface DistrictInfo {
  id: string;
  name: string;
  description: string;
  services: string[];
  transport: string[];
  commerceActive: boolean;
}

const CITY_DISTRICTS: Record<string, DistrictInfo[]> = {
  dubai: [
    { id: "downtown", name: "Downtown Dubai", description: "Iconic skyline with Burj Khalifa, Dubai Mall, and Dubai Fountain", services: ["shopping", "dining", "entertainment", "hotels"], transport: ["metro", "bus", "taxi"], commerceActive: true },
    { id: "marina", name: "Dubai Marina", description: "Waterfront living with Marina Walk, JBR Beach, and vibrant nightlife", services: ["dining", "gym", "beach", "marina"], transport: ["metro", "tram", "bus"], commerceActive: true },
    { id: "deira", name: "Deira", description: "Traditional markets, Gold Souk, and Spice Souk", services: ["market", "shopping", "dining"], transport: ["metro", "bus", "abra"], commerceActive: true },
    { id: "jlt", name: "Jumeirah Lake Towers", description: "Business and residential towers around scenic lakes", services: ["office", "dining", "gym"], transport: ["metro", "bus"], commerceActive: false },
  ],
  abu_dhabi: [
    { id: "corniche", name: "Corniche", description: "Scenic waterfront promenade with parks and beaches", services: ["parks", "beach", "dining", "hotels"], transport: ["bus", "taxi"], commerceActive: true },
    { id: "saadiyat", name: "Saadiyat Island", description: "Cultural district with Louvre Abu Dhabi and premium resorts", services: ["museum", "beach", "hotels", "gallery"], transport: ["bus", "taxi"], commerceActive: false },
    { id: "yas", name: "Yas Island", description: "Entertainment hub with Ferrari World, Yas Waterworld, and F1 circuit", services: ["entertainment", "theme_park", "hotels"], transport: ["bus", "taxi"], commerceActive: true },
  ],
  paris: [
    { id: "marais", name: "Le Marais", description: "Historic district with trendy boutiques, galleries, and cafés", services: ["shopping", "dining", "gallery", "museum"], transport: ["metro", "bus", "velib"], commerceActive: true },
    { id: "montmartre", name: "Montmartre", description: "Artistic hilltop village with Sacré-Cœur and charming streets", services: ["tourism", "dining", "art"], transport: ["metro", "bus", "funicular"], commerceActive: true },
    { id: "chatelet", name: "Châtelet-Les Halles", description: "Central hub with major shopping mall and transportation nexus", services: ["shopping", "dining", "cinema"], transport: ["metro", "rer", "bus"], commerceActive: true },
    { id: "latin_quarter", name: "Quartier Latin", description: "University district with bookshops, historic architecture", services: ["education", "dining", "bookshop"], transport: ["metro", "bus", "rer"], commerceActive: false },
  ],
  lyon: [
    { id: "vieux_lyon", name: "Vieux Lyon", description: "Renaissance architecture and traditional bouchons", services: ["tourism", "dining", "heritage"], transport: ["metro", "bus", "funicular"], commerceActive: true },
    { id: "presquile", name: "Presqu'île", description: "Central peninsula with Place Bellecour and shopping streets", services: ["shopping", "dining", "entertainment"], transport: ["metro", "bus", "tram"], commerceActive: true },
  ],
  marseille: [
    { id: "vieux_port", name: "Vieux-Port", description: "Historic harbor with fish market and waterfront dining", services: ["market", "dining", "tourism"], transport: ["metro", "bus", "ferry"], commerceActive: true },
    { id: "panier", name: "Le Panier", description: "Oldest neighborhood with colorful streets and artisan shops", services: ["art", "shopping", "dining"], transport: ["bus", "metro"], commerceActive: true },
  ],
  new_york: [
    { id: "manhattan", name: "Manhattan", description: "The iconic borough with Times Square, Central Park, and Wall Street", services: ["shopping", "dining", "entertainment", "finance"], transport: ["subway", "bus", "ferry", "taxi"], commerceActive: true },
    { id: "brooklyn", name: "Brooklyn", description: "Trendy borough with Williamsburg, DUMBO, and Prospect Park", services: ["dining", "art", "parks", "entertainment"], transport: ["subway", "bus"], commerceActive: true },
    { id: "queens", name: "Queens", description: "Most diverse borough with Flushing, Astoria, and JFK Airport", services: ["dining", "airport", "parks"], transport: ["subway", "bus", "airtrain"], commerceActive: false },
  ],
  los_angeles: [
    { id: "hollywood", name: "Hollywood", description: "Entertainment capital with studios, Walk of Fame, and nightlife", services: ["entertainment", "dining", "tourism"], transport: ["metro", "bus"], commerceActive: true },
    { id: "santa_monica", name: "Santa Monica", description: "Beachside city with pier, promenade, and Third Street shopping", services: ["beach", "shopping", "dining"], transport: ["metro", "bus", "bike"], commerceActive: true },
    { id: "downtown_la", name: "Downtown LA", description: "Business center with arts district, Grand Central Market", services: ["dining", "art", "business"], transport: ["metro", "bus", "dash"], commerceActive: true },
  ],
  chicago: [
    { id: "loop", name: "The Loop", description: "Downtown business and cultural center with Millennium Park", services: ["business", "dining", "parks", "museum"], transport: ["L_train", "bus", "metra"], commerceActive: true },
    { id: "magnificent_mile", name: "Magnificent Mile", description: "Premier shopping and dining boulevard on Michigan Avenue", services: ["shopping", "dining", "hotels"], transport: ["L_train", "bus"], commerceActive: true },
  ],
  london: [
    { id: "westminster", name: "Westminster", description: "Political center with Parliament, Big Ben, and Buckingham Palace", services: ["tourism", "government", "parks"], transport: ["tube", "bus", "river_bus"], commerceActive: true },
    { id: "shoreditch", name: "Shoreditch", description: "Tech hub and creative district with street art and startups", services: ["tech", "dining", "nightlife", "art"], transport: ["tube", "overground", "bus"], commerceActive: true },
    { id: "camden", name: "Camden", description: "Eclectic market district with music venues and street food", services: ["market", "music", "dining"], transport: ["tube", "bus"], commerceActive: true },
  ],
  manchester: [
    { id: "northern_quarter", name: "Northern Quarter", description: "Creative hub with indie shops, cafés, and street art", services: ["shopping", "dining", "art", "music"], transport: ["metrolink", "bus"], commerceActive: true },
    { id: "deansgate", name: "Deansgate", description: "Main thoroughfare with premium shopping and dining", services: ["shopping", "dining", "hotels"], transport: ["metrolink", "bus", "train"], commerceActive: true },
  ],
  riyadh: [
    { id: "olaya", name: "Olaya", description: "Commercial heart with Kingdom Tower and luxury shopping", services: ["shopping", "dining", "business"], transport: ["metro", "bus", "taxi"], commerceActive: true },
    { id: "diplomatic_quarter", name: "Diplomatic Quarter", description: "Embassies, parks, and premium residences", services: ["government", "parks", "dining"], transport: ["bus", "taxi"], commerceActive: false },
  ],
  jeddah: [
    { id: "al_balad", name: "Al-Balad", description: "UNESCO historic district with traditional coral architecture", services: ["heritage", "market", "dining"], transport: ["bus", "taxi"], commerceActive: true },
    { id: "corniche_jeddah", name: "Jeddah Corniche", description: "30km waterfront with sculptures, parks, and King Fahd Fountain", services: ["parks", "dining", "entertainment"], transport: ["bus", "taxi"], commerceActive: true },
  ],
  cairo: [
    { id: "zamalek", name: "Zamalek", description: "Upscale island district with galleries, embassies, and Nile views", services: ["dining", "gallery", "parks"], transport: ["metro", "bus", "taxi"], commerceActive: true },
    { id: "khan_khalili", name: "Khan el-Khalili", description: "Historic bazaar with centuries-old market traditions", services: ["market", "heritage", "dining"], transport: ["metro", "bus"], commerceActive: true },
    { id: "giza", name: "Giza", description: "Home of the Great Pyramids and the Sphinx", services: ["tourism", "heritage"], transport: ["metro", "bus", "taxi"], commerceActive: false },
  ],
  casablanca: [
    { id: "anfa", name: "Anfa", description: "Upscale residential and commercial district", services: ["shopping", "dining", "business"], transport: ["tram", "bus", "taxi"], commerceActive: true },
    { id: "habous", name: "Quartier Habous", description: "Neo-Moorish architecture and traditional crafts market", services: ["heritage", "market", "dining"], transport: ["bus", "taxi"], commerceActive: true },
  ],
  marrakech: [
    { id: "medina", name: "Medina", description: "UNESCO old city with Jemaa el-Fnaa square and souks", services: ["market", "heritage", "dining", "tourism"], transport: ["taxi", "walking"], commerceActive: true },
    { id: "gueliz", name: "Guéliz", description: "Modern district with European-style cafés and boutiques", services: ["shopping", "dining", "nightlife"], transport: ["bus", "taxi"], commerceActive: true },
  ],
};

const SERVICE_ICONS: Record<string, string> = {
  shopping: "🛍️", dining: "🍽️", entertainment: "🎭", hotels: "🏨",
  gym: "💪", beach: "🏖️", marina: "⛵", market: "🏪",
  office: "🏢", museum: "🏛️", gallery: "🎨", art: "🎨",
  parks: "🌳", tourism: "📸", heritage: "🕌", education: "📚",
  cinema: "🎬", tech: "💻", nightlife: "🌙", music: "🎵",
  theme_park: "🎢", airport: "✈️", business: "💼", government: "🏛️",
  bookshop: "📖", finance: "💰",
};

const TRANSPORT_LABELS: Record<string, string> = {
  metro: "Metro", bus: "Bus", taxi: "Taxi", tram: "Tram",
  subway: "Subway", tube: "Tube", rer: "RER", ferry: "Ferry",
  funicular: "Funiculaire", velib: "Vélib'", bike: "Bike",
  abra: "Abra", airtrain: "AirTrain", river_bus: "River Bus",
  overground: "Overground", metrolink: "Metrolink", train: "Train",
  L_train: "L Train", metra: "Metra", dash: "DASH", walking: "Walking",
};

function resolveCountryCode(geoValue: string | null): string | null {
  if (!geoValue) return null;
  const upper = geoValue.toUpperCase();
  if (upper.length === 2 && COUNTRIES.some((c) => c.code === upper)) return upper;
  const match = COUNTRIES.find((c) => c.name.toLowerCase() === geoValue.toLowerCase());
  return match?.code ?? null;
}

const COUNTRY_COORDS: Record<string, [number, number]> = {
  AE: [24.4539, 54.3773], FR: [46.6034, 2.3488], US: [39.8283, -98.5795],
  GB: [55.3781, -3.4360], SA: [23.8859, 45.0792], EG: [26.8206, 30.8025],
  MA: [31.7917, -7.0926], DE: [51.1657, 10.4515], IN: [20.5937, 78.9629],
  BR: [-14.2350, -51.9253], NG: [9.0820, 8.6753], JP: [36.2048, 138.2529],
};

const CITY_COORDS: Record<string, [number, number]> = {
  dubai: [25.2048, 55.2708], abu_dhabi: [24.4539, 54.3773],
  paris: [48.8566, 2.3522], lyon: [45.7640, 4.8357], marseille: [43.2965, 5.3698],
  new_york: [40.7128, -74.0060], los_angeles: [34.0522, -118.2437], chicago: [41.8781, -87.6298],
  london: [51.5074, -0.1278], manchester: [53.4808, -2.2426],
  riyadh: [24.7136, 46.6753], jeddah: [21.4858, 39.1925],
  cairo: [30.0444, 31.2357],
  casablanca: [33.5731, -7.5898], marrakech: [31.6295, -7.9811],
};

const CITY_SLUG_MAP: Record<string, string> = {
  dubai: "dubai", abu_dhabi: "abu-dhabi",
  paris: "paris", lyon: "lyon", marseille: "marseille",
  new_york: "new-york", los_angeles: "los-angeles", chicago: "chicago",
  london: "london", manchester: "manchester",
  riyadh: "riyadh", jeddah: "jeddah",
  cairo: "cairo",
  casablanca: "casablanca", marrakech: "marrakech",
};

const fadeSlide = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25, ease: "easeOut" },
};

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

function useProviderData(
  fetchFn: () => CanonicalGlobalFeedItem[],
  deps: unknown[],
): CanonicalGlobalFeedItem[] {
  const [items, setItems] = useState<CanonicalGlobalFeedItem[]>([]);
  const pollCount = useRef(0);

  useEffect(() => {
    pollCount.current = 0;
    const result = fetchFn();
    setItems(result);

    if (result.length > 0) return;

    const interval = setInterval(() => {
      pollCount.current += 1;
      const fresh = fetchFn();
      if (fresh.length > 0 || pollCount.current >= MAX_POLLS) {
        setItems(fresh);
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return items;
}

function WeatherWidget({ country, city }: { country: string; city?: string }) {
  const items = useProviderData(
    () => openMeteoProvider.fetch(country, city),
    [country, city],
  );

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Cloud className="h-3.5 w-3.5" />
        <span>Loading weather...</span>
      </div>
    );
  }

  useUiEngine("geo-geoexplorerpage");

  return (
    <SubPageShell>
      <div className="flex items-center gap-2 text-xs">
      <Sun className="h-3.5 w-3.5 text-amber-500" />
      <span className="text-foreground font-medium">{items[0].summary}</span>
      </div>
    </SubPageShell>
  );
}

function ForexWidget({ country }: { country: string }) {
  const items = useProviderData(
    () => frankfurterProvider.fetch(country),
    [country],
  );

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>Loading rates...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
      <span className="text-foreground font-medium">{items[0].summary}</span>
    </div>
  );
}

function TickerWidget({ country, city }: { country: string; city?: string }) {
  const [ticker, setTicker] = useState<TickerState | null>(null);

  useEffect(() => {
    const state = composeTicker(country, city);
    setTicker(state);

    if (state.gated || state.items.length > 0) return;

    let polls = 0;
    const interval = setInterval(() => {
      polls += 1;
      const fresh = composeTicker(country, city);
      if (fresh.items.length > 0 || polls >= MAX_POLLS) {
        setTicker(fresh);
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [country, city]);

  if (!ticker || ticker.gated || ticker.items.length === 0) return null;

  const currentItem = getCurrentTickerItem(ticker);
  if (!currentItem) return null;

  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 text-xs">
        <Radio className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Live Feed</span>
      </div>
      <p className="text-xs text-foreground mt-1 line-clamp-2">{currentItem.text}</p>
      <span className="text-[9px] text-muted-foreground mt-1 inline-block">
        {currentItem.category} · {currentItem.priority}
      </span>
    </div>
  );
}

function ExplorerMap({
  markers,
  center,
  zoom,
  onMarkerClick,
}: {
  markers: { code: string; label: string; lat: number; lng: number; flag: string }[];
  center: [number, number];
  zoom: number;
  onMarkerClick: (code: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    markers.forEach((m) => {
      const icon = L.divIcon({
        html: `<div style="font-size:24px;cursor:pointer;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))">${m.flag}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        className: "",
      });

      L.marker([m.lat, m.lng], { icon })
        .addTo(map)
        .bindTooltip(m.label, { direction: "top", offset: [0, -12] })
        .on("click", () => onMarkerClick(m.code));
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [markers, center, zoom, onMarkerClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[280px] rounded-xl border border-border overflow-hidden bg-muted/30"
      style={{ zIndex: 0 }}
    />
  );
}

function Breadcrumb({
  countryCode,
  countryName,
  cityName,
  onReset,
  onBackToCountry,
}: {
  countryCode: string | null;
  countryName: string | null;
  cityName: string | null;
  onReset: () => void;
  onBackToCountry: () => void;
}) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 flex-wrap">
      <button onClick={onReset} className="hover:text-foreground transition-colors flex items-center gap-1">
        <Globe className="h-3.5 w-3.5" />
        <span>Explorer</span>
      </button>
      {countryCode && (
        <>
          <ChevronRight className="h-3 w-3" />
          <button
            onClick={onBackToCountry}
            className={`hover:text-foreground transition-colors ${!cityName ? "text-foreground font-medium" : ""}`}
          >
            {countryName}
          </button>
        </>
      )}
      {cityName && (
        <>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{cityName}</span>
        </>
      )}
    </nav>
  );
}

function CountryListView({
  profiles,
  userCountryCode,
  onSelectCountry,
}: {
  profiles: CountryProfile[];
  userCountryCode: string | null;
  onSelectCountry: (code: string) => void;
}) {
  const sorted = useMemo(() => {
    if (!userCountryCode) return profiles;
    const userIdx = profiles.findIndex((p) => p.code === userCountryCode);
    if (userIdx <= 0) return profiles;
    const copy = [...profiles];
    const [item] = copy.splice(userIdx, 1);
    copy.unshift(item);
    return copy;
  }, [profiles, userCountryCode]);

  const mapMarkers = useMemo(
    () =>
      profiles
        .filter((p) => COUNTRY_COORDS[p.code])
        .map((p) => {
          const cd = getCountryByCode(p.code);
          const [lat, lng] = COUNTRY_COORDS[p.code];
          return { code: p.code, label: cd?.name || p.code, lat, lng, flag: cd?.flag || "🌍" };
        }),
    [profiles],
  );

  return (
    <motion.div {...fadeSlide}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Geographic Explorer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explore countries, cities, and districts with real-time information
        </p>
      </div>

      <div className="mb-6">
        <ExplorerMap
          markers={mapMarkers}
          center={[25, 20]}
          zoom={2}
          onMarkerClick={onSelectCountry}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((profile) => {
          const countryData = getCountryByCode(profile.code);
          const cities = getCityProfilesForCountry(profile.code, { bypassGate: true });
          const isUserCountry = userCountryCode === profile.code;
          return (
            <motion.button
              key={profile.code}
              onClick={() => onSelectCountry(profile.code)}
              className={`text-left p-4 rounded-xl border transition-all group ${
                isUserCountry
                  ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20"
                  : "border-border bg-card hover:bg-accent/5 hover:border-accent/30"
              }`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{countryData?.flag || "🌍"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                      {countryData?.name || profile.code}
                    </h3>
                    {isUserCountry && (
                      <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-medium shrink-0">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">
                      {profile.defaultCurrency}
                    </span>
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {profile.defaultLanguage.toUpperCase()}
                    </span>
                    {cities.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {cities.length} {cities.length === 1 ? "city" : "cities"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.availableModules.slice(0, 4).map((mod) => (
                      <span key={mod} className="text-[9px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-full">
                        {mod}
                      </span>
                    ))}
                    {profile.availableModules.length > 4 && (
                      <span className="text-[9px] text-muted-foreground">
                        +{profile.availableModules.length - 4}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0 mt-1" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function CountryDetailView({
  profile,
  cities,
  userCity,
  onSelectCity,
}: {
  profile: CountryProfile;
  cities: CityProfile[];
  userCity: string | null;
  onSelectCity: (cityId: string) => void;
}) {
  const countryData = getCountryByCode(profile.code);

  const sorted = useMemo(() => {
    if (!userCity) return cities;
    const uc = userCity.toLowerCase();
    const idx = cities.findIndex((c) => c.cityName.toLowerCase() === uc || c.cityId === uc);
    if (idx <= 0) return cities;
    const copy = [...cities];
    const [item] = copy.splice(idx, 1);
    copy.unshift(item);
    return copy;
  }, [cities, userCity]);

  const cityMapMarkers = useMemo(
    () =>
      cities
        .filter((c) => CITY_COORDS[c.cityId])
        .map((c) => {
          const [lat, lng] = CITY_COORDS[c.cityId];
          return { code: c.cityId, label: c.cityName, lat, lng, flag: "📍" };
        }),
    [cities],
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (COUNTRY_COORDS[profile.code]) return COUNTRY_COORDS[profile.code];
    if (cityMapMarkers.length > 0) return [cityMapMarkers[0].lat, cityMapMarkers[0].lng];
    return [25, 20];
  }, [profile.code, cityMapMarkers]);

  return (
    <motion.div {...fadeSlide}>
      <div className="flex items-center gap-4 mb-6">
        <span className="text-5xl">{countryData?.flag || "🌍"}</span>
        <div>
          <h1 className="text-xl font-bold text-foreground">{countryData?.name || profile.code}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>{profile.defaultCurrency}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Languages className="h-3 w-3" />
              <span>{profile.supportedLanguages.join(", ")}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{profile.timezones[0]}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg border border-border bg-card">
          <WeatherWidget country={profile.code} />
        </div>
        <div className="p-3 rounded-lg border border-border bg-card">
          <ForexWidget country={profile.code} />
        </div>
      </div>

      <TickerWidget country={profile.code} />

      <div className="mb-4 mt-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-accent" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Available Modules</h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {profile.availableModules.map((mod) => (
            <span key={mod} className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">
              {mod}
            </span>
          ))}
        </div>
      </div>

      {profile.culturalFlags && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-blue-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cultural & Compliance</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(profile.culturalFlags).filter(([_, v]) => v).map(([k]) => (
              <span key={k} className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                {k.replace(/_/g, " ")}
              </span>
            ))}
            {Object.entries(profile.complianceFlags).filter(([_, v]) => v).map(([k]) => (
              <span key={k} className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                {k.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4 text-accent" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Cities ({cities.length})
          </h2>
        </div>
      </div>

      {cityMapMarkers.length > 0 && (
        <div className="mb-4">
          <ExplorerMap
            markers={cityMapMarkers}
            center={mapCenter}
            zoom={5}
            onMarkerClick={onSelectCity}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((city) => {
          const isUserCity = userCity?.toLowerCase() === city.cityName.toLowerCase() || userCity?.toLowerCase() === city.cityId;
          return (
            <motion.button
              key={city.cityId}
              onClick={() => onSelectCity(city.cityId)}
              className={`text-left p-4 rounded-xl border transition-all group ${
                isUserCity
                  ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20"
                  : "border-border bg-card hover:bg-accent/5 hover:border-accent/30"
              }`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                      {city.cityName}
                    </h3>
                    {isUserCity && (
                      <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-medium shrink-0">
                        You
                      </span>
                    )}
                  </div>
                  {city.region && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{city.region}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {city.population && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{(city.population / 1_000_000).toFixed(1)}M</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{city.timezone.split("/").pop()}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {city.localProviders.slice(0, 3).map((p) => (
                      <span key={p} className="text-[9px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-full">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0 mt-1" />
              </div>
              <div className="mt-3 pt-2 border-t border-border/50">
                <WeatherWidget country={profile.code} city={city.cityId} />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function NotFoundView({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <motion.div {...fadeSlide} className="text-center py-16">
      <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-500 opacity-60" />
      <h2 className="text-lg font-semibold text-foreground mb-1">{message}</h2>
      <p className="text-sm text-muted-foreground mb-4">The requested location could not be found.</p>
      <button
        onClick={onReset}
        className="text-sm text-accent hover:underline"
      >
        Back to Explorer
      </button>
    </motion.div>
  );
}

function CityDetailView({
  profile,
  city,
  districts,
}: {
  profile: CountryProfile;
  city: CityProfile;
  districts: DistrictInfo[];
}) {
  const countryData = getCountryByCode(profile.code);
  const citySlug = CITY_SLUG_MAP[city.cityId] || city.cityId.replace(/_/g, "-");

  return (
    <motion.div {...fadeSlide}>
      <div className="flex items-center gap-4 mb-6">
        <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
          <MapPin className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{city.cityName}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {countryData?.flag} {countryData?.name}
            </span>
            {city.region && (
              <span className="text-xs text-muted-foreground">• {city.region}</span>
            )}
            {city.population && (
              <span className="text-xs text-muted-foreground">
                • {(city.population / 1_000_000).toFixed(1)}M pop.
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg border border-border bg-card">
          <WeatherWidget country={profile.code} city={city.cityId} />
        </div>
        <div className="p-3 rounded-lg border border-border bg-card">
          <ForexWidget country={profile.code} />
        </div>
      </div>

      <TickerWidget country={profile.code} city={city.cityId} />

      <div className="flex flex-wrap gap-2 mb-6 mt-4">
        <Link
          to={`/city-market/${citySlug}`}
          className="inline-flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-full font-medium hover:bg-accent/20 transition-colors"
        >
          <Store className="h-3 w-3" />
          Marketplace
          <ExternalLink className="h-2.5 w-2.5" />
        </Link>
        <Link
          to={`/city/${citySlug}`}
          className="inline-flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-full font-medium hover:bg-accent/20 transition-colors"
        >
          <Building2 className="h-3 w-3" />
          City Hub
          <ExternalLink className="h-2.5 w-2.5" />
        </Link>
        <Link
          to="/radar"
          className="inline-flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-600 px-3 py-1.5 rounded-full font-medium hover:bg-blue-500/20 transition-colors"
        >
          <MapIcon className="h-3 w-3" />
          Open Map
          <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-accent" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Local Providers</h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {city.localProviders.map((p) => (
            <span key={p} className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4 text-accent" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Districts & Quarters ({districts.length})
          </h2>
        </div>
      </div>

      {districts.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No district data available for this city yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {districts.map((district, i) => (
            <motion.div
              key={district.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl border border-border bg-card"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-foreground">{district.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{district.description}</p>
                </div>
                {district.commerceActive && (
                  <Link
                    to={`/city-market/${citySlug}`}
                    className="text-[9px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-medium shrink-0 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                  >
                    C2C Active
                    <ExternalLink className="h-2 w-2" />
                  </Link>
                )}
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Store className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Services</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {district.services.map((s) => (
                    <span key={s} className="text-[10px] bg-muted/70 text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                      {SERVICE_ICONS[s] && <span>{SERVICE_ICONS[s]}</span>}
                      {s.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Bus className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Transport</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {district.transport.map((t) => (
                    <span key={t} className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                      {TRANSPORT_LABELS[t] || t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

const GeoExplorerPage = () => {
  useUiEngine("geo-geoexplorerpage");
  const { countryCode, cityId } = useParams<{ countryCode?: string; cityId?: string }>();
  const navigate = useNavigate();
  const selectedCountry = countryCode?.toUpperCase() || null;
  const selectedCity = cityId || null;

  const geoCountryRaw = useGeoStore((s) => s.country);
  const geoCity = useGeoStore((s) => s.city);
  const userCountryCode = useMemo(() => resolveCountryCode(geoCountryRaw), [geoCountryRaw]);

  const profiles = useMemo(() => getAllCountryProfiles({ bypassGate: true }), []);

  const currentProfile = useMemo(
    () => (selectedCountry ? profiles.find((p) => p.code === selectedCountry) || null : null),
    [selectedCountry, profiles],
  );

  const currentCities = useMemo(
    () => (selectedCountry ? getCityProfilesForCountry(selectedCountry, { bypassGate: true }) : []),
    [selectedCountry],
  );

  const currentCity = useMemo(
    () => currentCities.find((c) => c.cityId === selectedCity) || null,
    [currentCities, selectedCity],
  );

  const currentDistricts = useMemo(
    () => (selectedCity ? CITY_DISTRICTS[selectedCity] || [] : []),
    [selectedCity],
  );

  const countryData = useMemo(
    () => (selectedCountry ? getCountryByCode(selectedCountry) : null),
    [selectedCountry],
  );

  const handleSelectCountry = useCallback(
    (code: string) => navigate(`/geo-explorer/${code}`),
    [navigate],
  );

  const handleSelectCity = useCallback(
    (cId: string) => navigate(`/geo-explorer/${countryCode}/${cId}`),
    [navigate, countryCode],
  );

  const handleReset = useCallback(
    () => navigate("/geo-explorer"),
    [navigate],
  );

  const handleBackToCountry = useCallback(
    () => navigate(`/geo-explorer/${countryCode}`),
    [navigate, countryCode],
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-[var(--page-bottom-pad)]">
      <Breadcrumb
        countryCode={selectedCountry}
        countryName={countryData?.name || selectedCountry}
        cityName={currentCity?.cityName || null}
        onReset={handleReset}
        onBackToCountry={handleBackToCountry}
      />

      <AnimatePresence mode="wait">
        {!selectedCountry && (
          <CountryListView
            key="countries"
            profiles={profiles}
            userCountryCode={userCountryCode}
            onSelectCountry={handleSelectCountry}
          />
        )}

        {selectedCountry && !currentProfile && (
          <NotFoundView
            key="not-found-country"
            message={`Country "${selectedCountry}" not found`}
            onReset={handleReset}
          />
        )}

        {selectedCountry && !selectedCity && currentProfile && (
          <CountryDetailView
            key={`country-${selectedCountry}`}
            profile={currentProfile}
            cities={currentCities}
            userCity={geoCity}
            onSelectCity={handleSelectCity}
          />
        )}

        {selectedCountry && selectedCity && currentProfile && !currentCity && (
          <NotFoundView
            key="not-found-city"
            message={`City "${selectedCity}" not found in ${countryData?.name || selectedCountry}`}
            onReset={handleReset}
          />
        )}

        {selectedCountry && selectedCity && currentProfile && currentCity && (
          <CityDetailView
            key={`city-${selectedCity}`}
            profile={currentProfile}
            city={currentCity}
            districts={currentDistricts}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default GeoExplorerPage;
