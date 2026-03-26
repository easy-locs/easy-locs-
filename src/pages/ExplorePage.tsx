/**
 * ExplorePage — Global discovery page for browsing by region, country, city, category.
 * SEO-optimized worldwide discovery experience.
 */
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, MapPin, ChevronRight, Search, TrendingUp, Star } from "lucide-react";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";
import { BoostSlotRenderer } from "@/components/boost/BoostSlotRenderer";
import { useHomeSections } from "@/hooks/useHomeSections";
import { useLocationStore } from "@/stores/locationStore";
import { useCanonicalUI } from "@/hooks/useCanonicalUI";
import { cn } from "@/lib/utils";

/* ═══ Regions & Cities Data ═══ */
const REGIONS = [
  {
    name: "Middle East",
    emoji: "🕌",
    countries: [
      { code: "AE", name: "UAE", cities: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah"] },
      { code: "SA", name: "Saudi Arabia", cities: ["Riyadh", "Jeddah", "Dammam", "Makkah", "Madinah"] },
      { code: "QA", name: "Qatar", cities: ["Doha"] },
      { code: "BH", name: "Bahrain", cities: ["Manama"] },
      { code: "KW", name: "Kuwait", cities: ["Kuwait City"] },
      { code: "OM", name: "Oman", cities: ["Muscat"] },
    ],
  },
  {
    name: "Europe",
    emoji: "🏰",
    countries: [
      { code: "FR", name: "France", cities: ["Paris", "Lyon", "Marseille", "Nice", "Bordeaux"] },
      { code: "GB", name: "United Kingdom", cities: ["London", "Manchester", "Birmingham", "Edinburgh"] },
      { code: "DE", name: "Germany", cities: ["Berlin", "Munich", "Frankfurt", "Hamburg"] },
      { code: "ES", name: "Spain", cities: ["Madrid", "Barcelona", "Valencia", "Seville"] },
      { code: "IT", name: "Italy", cities: ["Rome", "Milan", "Florence", "Naples"] },
    ],
  },
  {
    name: "Africa",
    emoji: "🌍",
    countries: [
      { code: "MA", name: "Morocco", cities: ["Casablanca", "Marrakech", "Rabat", "Fez", "Tangier"] },
      { code: "EG", name: "Egypt", cities: ["Cairo", "Alexandria", "Giza"] },
      { code: "NG", name: "Nigeria", cities: ["Lagos", "Abuja"] },
      { code: "ZA", name: "South Africa", cities: ["Cape Town", "Johannesburg"] },
      { code: "KE", name: "Kenya", cities: ["Nairobi", "Mombasa"] },
    ],
  },
  {
    name: "Asia Pacific",
    emoji: "🏯",
    countries: [
      { code: "JP", name: "Japan", cities: ["Tokyo", "Osaka", "Kyoto"] },
      { code: "SG", name: "Singapore", cities: ["Singapore"] },
      { code: "IN", name: "India", cities: ["Mumbai", "Delhi", "Bangalore"] },
      { code: "TH", name: "Thailand", cities: ["Bangkok", "Phuket", "Chiang Mai"] },
    ],
  },
  {
    name: "Americas",
    emoji: "🗽",
    countries: [
      { code: "US", name: "United States", cities: ["New York", "Los Angeles", "Miami", "San Francisco"] },
      { code: "CA", name: "Canada", cities: ["Toronto", "Vancouver", "Montreal"] },
      { code: "BR", name: "Brazil", cities: ["São Paulo", "Rio de Janeiro"] },
    ],
  },
];

const VERTICALS = [
  { key: "food", label: "Food", emoji: "🍕", route: "/browse/food" },
  { key: "grocery", label: "Grocery", emoji: "🛒", route: "/browse/grocery" },
  { key: "shops", label: "Shops", emoji: "🛍️", route: "/browse/retail" },
  { key: "services", label: "Services", emoji: "🔧", route: "/browse/services" },
  { key: "healthcare", label: "Healthcare", emoji: "💊", route: "/browse/healthcare" },
  { key: "property", label: "Property", emoji: "🏠", route: "/browse/real_estate" },
  { key: "travel", label: "Travel", emoji: "✈️", route: "/travel" },
  { key: "stays", label: "Stays", emoji: "🏨", route: "/travel/stays" },
];

export default function ExplorePage() {
  const navigate = useNavigate();
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const { data: sections } = useHomeSections();
  const location = useLocationStore((s) => s.currentLocation);
  const canonicalUI = useCanonicalUI();

  const trending = sections?.trending ?? [];

  return (
    <div className="app-mobile-page bg-background pb-24">
      {/* Hero */}
      <div className="relative px-4 pt-6 pb-4">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-black text-foreground">Explore the World</h1>
          </div>
          <UnifiedSearchBar variant="hero" placeholder="Search any city, category, or business..." />
      </motion.div>
      </div>

      {/* ═══ BOOST SLOT — Explore Hero ═══ */}
      <div className="px-4 mb-4">
        <BoostSlotRenderer surface="explore" slotKey="hero_primary" variant="inline" />
      </div>

      {/* Near You — dynamic */}
      {location && trending.length > 0 && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="px-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Popular near you
            </h2>
            <Link to="/radar" className="text-[10px] text-primary font-medium flex items-center gap-0.5">
              See all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
            {trending.slice(0, 6).map((shop) => (
              <Link
                key={shop.id}
                to={`/s/${shop.slug}`}
                className="shrink-0 w-[130px] rounded-2xl border border-border/15 bg-card/50 overflow-hidden active:scale-[0.96] transition-transform"
              >
                <div className="h-[80px] bg-muted/10 overflow-hidden">
                  {(shop.banner_url || shop.logo_url) ? (
                    <img src={shop.banner_url || shop.logo_url!} alt={shop.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Star className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-[10px] font-bold truncate text-foreground">{shop.name}</p>
                  {shop.rating > 0 && (
                    <p className="text-[9px] text-amber-500 font-semibold">★ {Number(shop.rating).toFixed(1)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* Browse by Category */}
      <section className="px-4 mb-6">
        <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary" /> Browse by category
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {VERTICALS.map((v) => (
            <Link
              key={v.key}
              to={v.route}
              className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-card border border-border/10 active:scale-95 transition-transform"
            >
              <span className="text-2xl">{v.emoji}</span>
              <span className="text-[10px] font-bold text-foreground">{v.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by Region */}
      <section className="px-4 mb-6">
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-primary" /> Browse by region
        </h2>

        {/* Region chips */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-3">
          {REGIONS.map((region) => (
            <button
              key={region.name}
              onClick={() => setActiveRegion(activeRegion === region.name ? null : region.name)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap active:scale-95 transition-all",
                activeRegion === region.name
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {region.emoji} {region.name}
            </button>
          ))}
        </div>

        {/* Countries & Cities */}
        {REGIONS.filter((r) => !activeRegion || r.name === activeRegion).map((region) => (
          <motion.div
            key={region.name}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            {activeRegion && (
              <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">
                {region.emoji} {region.name}
              </p>
            )}
            <div className="space-y-2">
              {region.countries.slice(0, activeRegion ? undefined : 2).map((country) => (
                <div key={country.code} className="rounded-xl border border-border/10 bg-card/50 p-3">
                  <p className="text-xs font-bold text-foreground mb-1.5">{country.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {country.cities.map((city) => (
                      <button
                        key={city}
                        onClick={() => navigate(`/radar?city=${encodeURIComponent(city)}&country=${country.code}`)}
                        className="px-2.5 py-1 rounded-full bg-muted text-[10px] font-medium text-foreground active:scale-95 transition-transform hover:bg-primary/10 hover:text-primary"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
