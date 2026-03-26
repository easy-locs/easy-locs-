/**
 * SmartHome — Production-clean super-app home with data-driven sections.
 * Careem-style category grid with 3D icons + geo-aware delivery area.
 * Uses canonical discovery pipeline + Living Commerce Engine for all sections.
 * SINGLE SOURCE OF TRUTH: smart-home-engine.ts (10 primary categories).
 */
import { memo, useMemo, useEffect, useState, useCallback } from "react";
import { GeoStatusIndicator } from "@/components/geo/GeoStatusIndicator";
import { BoostSlotRenderer } from "@/components/boost/BoostSlotRenderer";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Wallet, QrCode, Send, ChevronRight, Star, Navigation } from "lucide-react";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";
import { useLocationStore } from "@/stores/locationStore";
// notification store used by NotificationBell component directly
import { useHomeSections } from "@/hooks/useHomeSections";
import { getSmartCategories, getSmartHero, getTimeGreeting, type SmartCategory } from "@/lib/smart-home-engine";
import { eventBus } from "@/lib/core/event-bus";
import { motion } from "framer-motion";
import { useLivingPage } from "@/hooks/useLivingPage";
import { useGlobalContext } from "@/hooks/useGlobalContext";
import { staggerContainer, staggerItem, fadeSlideUp, TRANSITIONS } from "@/lib/motion/motion-system";
import { getTopBanners } from "@/lib/context-banner/context-banner-engine";
import { AddressSelectorSheet } from "@/components/address/AddressSelectorSheet";
import { MobilityLiveMap } from "@/components/mobility/MobilityLiveMap";
import NotificationBell from "@/components/storefront/NotificationBell";

import foodImg from "@/assets/categories/food.png";
import groceryImg from "@/assets/categories/grocery.png";
import shopsImg from "@/assets/categories/shops.png";
import servicesImg from "@/assets/categories/services.png";
import taxiImg from "@/assets/categories/taxi.png";
import deliveryImg from "@/assets/categories/delivery.png";
import propertyImg from "@/assets/categories/property.png";
import beautyImg from "@/assets/categories/beauty.png";
import travelImg from "@/assets/categories/travel.png";
import pharmacyImg from "@/assets/categories/pharmacy.png";

/** Only 10 primary category images — no subcategory images at dashboard level */
const CATEGORY_IMAGES: Record<string, string> = {
  food: foodImg, grocery: groceryImg, shops: shopsImg, services: servicesImg,
  taxi: taxiImg, delivery: deliveryImg, property: propertyImg,
  beauty: beautyImg, travel: travelImg, pharmacy: pharmacyImg,
};

type HomeShopPreview = ReturnType<typeof useHomeSections>["data"] extends infer T ? T extends { trending: (infer U)[] } ? U : never : never;

const SECTION_DEFS = [
  { key: "trending", title: "Trending", icon: "🔥" },
  { key: "bestRated", title: "Best Rated", icon: "⭐" },
  { key: "newest", title: "New on Easy Locs", icon: "✨" },
  { key: "nearYou", title: "Near You", icon: "📍" },
] as const;

/* ═══ Top Hero Banner — Careem-style with location + search ═══ */
const TopHeroBanner = memo(({ city, greeting, timezone, onLocationTap }: { city: string | null; greeting: string; timezone?: string; onLocationTap: () => void }) => {
  const hero = getSmartHero(timezone);
  const locationLabel = city || "your area";

  return (
    <div className="relative mb-4 overflow-visible rounded-[1.75rem] px-4 pb-4 pt-4" style={{ background: hero.gradient }}>
      {/* Location + Notification row */}
      <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
        <button onClick={onLocationTap} className="flex min-w-0 max-w-[72%] items-center gap-2 active:scale-95 transition-transform">
          <MapPin className="h-4 w-4 text-white/70 shrink-0" />
          <span className="truncate text-xs font-medium text-white/80">{locationLabel}</span>
        </button>
        <div className="shrink-0 rounded-full bg-white/15">
          <NotificationBell />
        </div>
      </div>

      {/* Title + emoji */}
      <div className="relative z-10 mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pr-1">
          <h2 className="line-clamp-2 text-lg font-black leading-snug text-white">{hero.title}</h2>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/70">{hero.subtitle}</p>
        </div>
        <span className="text-3xl select-none shrink-0 opacity-60">{hero.emoji}</span>
      </div>

      {/* CTA */}
      <Link
        to={hero.route}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 text-white text-xs font-bold active:bg-white/30 transition-colors relative z-10 mb-3"
      >
        {hero.cta} <ChevronRight className="h-3.5 w-3.5" />
      </Link>

      {/* Search bar inside banner */}
      <div className="relative z-20">
        <UnifiedSearchBar variant="fullscreen" placeholder="Search anything…" />
      </div>
    </div>
  );
});

/* ═══ Quick Actions Strip ═══ */
const QuickActions = memo(() => (
  <div className="mb-4 flex items-center gap-2">
    {[
      { icon: QrCode, label: "Scan", to: "/pay/scan" },
      { icon: Send, label: "Pay", to: "/wallet/transfer" },
      { icon: Wallet, label: "Wallet", to: "/wallet/hub" },
    ].map(({ icon: Icon, label, to }) => (
      <Link
        key={label}
        to={to}
        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border/20 bg-card/60 px-3 active:scale-95 active:bg-primary/5 transition-all"
      >
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate text-xs font-semibold text-foreground">{label}</span>
      </Link>
    ))}
  </div>
));

/* ═══ Category Card — Careem-style with 3D image ═══ */
function CategoryCard({ cat, index }: { cat: SmartCategory; index: number }) {
  const imgSrc = cat.image ? CATEGORY_IMAGES[cat.image] : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.015 * index, duration: 0.2 }}
      className="shrink-0"
    >
      <Link
        to={cat.route}
        className="group relative flex h-[106px] w-[88px] flex-col items-center justify-between overflow-visible rounded-2xl border border-border/10 bg-muted/30 p-2 transition-all duration-150 active:scale-[0.92]"
      >
        {cat.subtitle && (
          <span className="absolute -top-1 -right-1 text-[7px] font-bold px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground leading-none z-10">
            {cat.subtitle}
          </span>
        )}
        <div className="flex w-full flex-1 items-center justify-center">
          {imgSrc ? (
            <img src={imgSrc} alt={cat.label} className="h-14 w-14 object-contain drop-shadow-md" loading="lazy" />
          ) : (
            <span className="text-2xl">{cat.icon}</span>
          )}
        </div>
        <p className="mt-0.5 min-h-[2rem] w-full text-center text-[10px] font-bold leading-tight text-foreground line-clamp-2">{cat.label}</p>
      </Link>
    </motion.div>
  );
}




/* ═══ Data-Driven Section ═══ */
function DynamicSection({ section, shops, index }: { section: { key: string; title: string; icon: string }; shops: any[]; index: number }) {
  if (shops.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + index * 0.04 }} className="mb-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <span>{section.icon}</span> {section.title}
        </h3>
        <Link to="/radar" className="text-[11px] font-medium text-primary flex items-center gap-0.5 active:opacity-70">
          See all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none px-1">
        {shops.map((shop: any) => (
          <Link
            key={shop.id}
            to={`/s/${shop.slug}`}
            className="shrink-0 w-[182px] rounded-2xl border border-border/15 bg-card overflow-visible active:scale-[0.96] transition-transform"
          >
            <div className="relative flex h-[112px] items-center justify-center overflow-hidden rounded-t-2xl bg-muted/20">
              {(shop.banner_url || shop.logo_url) ? (
                <img src={shop.banner_url || shop.logo_url!} alt={shop.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <Star className="h-6 w-6 text-muted-foreground/20" />
              )}
            </div>
            <div className="min-w-0 space-y-1.5 p-3">
              <p className="min-h-[2rem] text-xs font-bold leading-snug text-foreground line-clamp-2">{shop.name}</p>
              <div className="flex items-start gap-1.5">
                {shop.rating != null && shop.rating > 0 && (
                  <span className="text-[10px] text-amber-500 font-semibold shrink-0">★ {Number(shop.rating).toFixed(1)}</span>
                )}
                <p className="line-clamp-2 min-w-0 text-[10px] leading-relaxed text-muted-foreground">{shop.address || shop.vertical || "Dubai"}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══ Main Component ═══ */
export default function SmartHome() {
  const navigate = useNavigate();
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const isFallback = useLocationStore((s) => s.isFallback);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const handleLocationTap = useCallback(() => setAddressSheetOpen(true), []);

  // Canonical pipeline-backed sections
  const { data: sections } = useHomeSections();
  const safeSections = sections ?? { trending: [], bestRated: [], newest: [], nearYou: [] };

  useEffect(() => {
    if (sections) {
      const count = Object.values(sections).filter((arr) => arr.length > 0).length;
      eventBus.emit("HOME_SECTIONS_REFRESHED", { sectionCount: count });
    }
  }, [sections]);

  const city = useMemo(() => {
    try {
      const raw = localStorage.getItem("orbit:last-geo");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.city) return parsed.city;
      }
    } catch {}
    if (currentLocation && !isFallback) {
      import("@/lib/mapbox/geocoding").then(({ reverseGeocode }) => {
        reverseGeocode(currentLocation.lat, currentLocation.lng).then(res => {
          const place = res?.features?.[0];
          if (place) {
            const cityCtx = place.context?.find((c: any) => c.id?.startsWith("place"));
            const cityName = cityCtx?.text || place.text;
            if (cityName) {
              try { localStorage.setItem("orbit:last-geo", JSON.stringify({ city: cityName, country: "AE" })); } catch {}
            }
          }
        }).catch(() => {});
      });
      return "Dubai";
    }
    return null;
  }, [currentLocation, isFallback]);

  const timezone = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
  }, []);

  const countryCode = useMemo(() => {
    try {
      const raw = localStorage.getItem("orbit:last-geo");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.country) return parsed.country;
      }
    } catch {}
    return undefined;
  }, []);

  const categories = useMemo(() => getSmartCategories(timezone, countryCode), [timezone, countryCode]);
  const greeting = useMemo(() => getTimeGreeting(timezone), [timezone]);

  const half = Math.ceil(categories.length / 2);
  const row1 = categories.slice(0, half);
  const row2 = categories.slice(half);

  const _living = useLivingPage({ country: countryCode, city: city || undefined, maxSections: 6 });
  const globalCtx = useGlobalContext({ country: countryCode, city: city || undefined });
  const contextBanners = useMemo(
    () => getTopBanners({ country: countryCode, city, hour: globalCtx.localHour }, 1),
    [countryCode, city, globalCtx.localHour],
  );

  return (
    <div className="w-full min-w-0 pb-6">
      <div className="px-3 pt-3 sm:px-4 sm:pt-4">
        <TopHeroBanner city={city} greeting={greeting} timezone={timezone} onLocationTap={handleLocationTap} />
        <QuickActions />

        {/* Category grid — horizontal scrollable, 2 rows */}
        <div className="mb-4 touch-pan-x overflow-x-auto scrollbar-none">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-2 px-0.5"
            style={{ width: "max-content" }}
          >
            <div className="flex gap-2.5">
              {row1.map((cat, i) => <CategoryCard key={cat.key} cat={cat} index={i} />)}
            </div>
            <div className="flex gap-2.5">
              {row2.map((cat, i) => <CategoryCard key={cat.key} cat={cat} index={i + half} />)}
            </div>
          </motion.div>
        </div>

        {/* ═══ Context Banner ═══ */}
        {contextBanners.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={TRANSITIONS.smooth}
            className="mb-4"
          >
            <Link
              to={contextBanners[0].route || "/radar"}
              className="block rounded-2xl border border-border/15 p-4 active:scale-[0.98] transition-transform"
              style={{ background: contextBanners[0].gradient }}
            >
              <p className="text-sm font-bold leading-snug text-foreground">
                {contextBanners[0].emoji} {contextBanners[0].title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">{contextBanners[0].subtitle}</p>
              {contextBanners[0].cta && (
                <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  {contextBanners[0].cta} <ChevronRight className="h-3.5 w-3.5" />
                </span>
              )}
            </Link>
          </motion.div>
        )}

        {/* ═══ BOOST SLOT ═══ */}
        <BoostSlotRenderer surface="home" slotKey="hero_primary" variant="hero" className="mb-4" />
      </div>

      <div className="px-3 sm:px-4">
      {/* ═══ Live Map ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, ...TRANSITIONS.smooth }}
        className="mb-4"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>📍</span> Live near you
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/mobility/delivery" className="text-[11px] font-medium text-muted-foreground flex items-center gap-0.5 active:opacity-70">
              Send <ChevronRight className="h-3 w-3" />
            </Link>
            <Link to="/mobility/taxi" className="text-[11px] font-medium text-primary flex items-center gap-0.5 active:opacity-70">
              Ride <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <Link to="/mobility/taxi" className="block">
          <MobilityLiveMap
            pickupLat={currentLocation?.lat}
            pickupLng={currentLocation?.lng}
            mode="taxi"
            nearbyRiders={5}
            className="h-[200px]"
          />
        </Link>
      </motion.div>

      {/* ═══ Data Sections ═══ */}
      {SECTION_DEFS.map((sec, i) => (
        <DynamicSection key={sec.key} section={sec} shops={safeSections[sec.key as keyof typeof safeSections]} index={i} />
      ))}

      {/* ═══ BOOST SLOT — Inline ═══ */}
      <div className="pb-4">
        <BoostSlotRenderer surface="home" slotKey="inline_banner_1" variant="inline" />
      </div>
      </div>

      <AddressSelectorSheet open={addressSheetOpen} onOpenChange={setAddressSheetOpen} />
    </div>
  );
}
