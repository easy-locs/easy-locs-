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
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="relative mb-4 overflow-hidden rounded-[1.75rem] px-4 pb-3 pt-3" style={{ background: hero.gradient }}>
      {/* Animated shimmer overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 35%, hsla(0,0%,100%,0.06) 50%, transparent 65%)",
        }}
        animate={{ x: ["-120%", "200%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
      />
      
      {/* Ambient glow */}
      <motion.div
        className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsla(0,0%,100%,0.1) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Location + Notification row */}
      <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
        <button onClick={onLocationTap} className="flex min-w-0 max-w-[78%] items-center gap-2 active:scale-95 transition-transform">
          <MapPin className="h-4 w-4 text-white/70 shrink-0" />
          <span className="text-xs font-medium text-white/80 break-words line-clamp-2 leading-snug text-left text-balance-soft">{locationLabel}</span>
        </button>
        <div className="shrink-0 rounded-full bg-white/15">
          <NotificationBell />
        </div>
      </div>

      {/* Title + emoji */}
      <div className="relative z-10 mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pr-1">
          <motion.h2
            className="line-clamp-2 text-base font-black leading-snug text-white text-balance"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {hero.title}
          </motion.h2>
          <motion.p
            className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-white/70 text-balance-soft"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {hero.subtitle}
          </motion.p>
        </div>
        <motion.span
          className="text-2xl select-none shrink-0"
          animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {hero.emoji}
        </motion.span>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Link
          to={hero.route}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[11px] font-bold active:bg-white/30 transition-colors relative z-10 mb-2 border border-white/10"
        >
          {hero.cta} <ChevronRight className="h-3 w-3" />
        </Link>
      </motion.div>

      {/* Search bar inside banner */}
      <div className="relative z-10">
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
        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/20 bg-card/60 px-2 active:scale-95 active:bg-primary/5 transition-all"
      >
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[11px] font-semibold text-foreground break-words leading-snug">{label}</span>
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
        className="group relative flex h-[112px] w-[84px] flex-col items-center justify-between overflow-visible rounded-2xl border border-border/10 bg-muted/30 p-2.5 transition-all duration-150 active:scale-[0.92]"
      >
        {cat.subtitle && (
          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground leading-none z-10 whitespace-nowrap shadow-sm">
            {cat.subtitle}
          </span>
        )}
        <div className="flex w-full flex-1 items-center justify-center">
          {imgSrc ? (
            <img src={imgSrc} alt={cat.label} className="h-11 w-11 object-contain drop-shadow-md" loading="lazy" />
          ) : (
            <span className="text-2xl">{cat.icon}</span>
          )}
        </div>
        <p className="mt-1 w-full text-center text-[10px] font-bold leading-snug text-foreground line-clamp-2 break-words hyphens-auto text-balance-soft"
           style={{ wordBreak: "break-word" }}
        >{cat.label}</p>
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
            className="shrink-0 w-[170px] rounded-2xl border border-border/15 bg-card overflow-hidden active:scale-[0.96] transition-transform flex flex-col"
          >
            <div className="relative aspect-[16/10] flex items-center justify-center overflow-hidden rounded-t-2xl bg-muted/20 shrink-0">
              {(shop.banner_url || shop.logo_url) ? (
                <img src={shop.banner_url || shop.logo_url!} alt={shop.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <Star className="h-6 w-6 text-muted-foreground/20" />
              )}
            </div>
            <div className="min-w-0 space-y-1.5 p-3 flex-1 flex flex-col">
              <p className="text-xs font-bold leading-snug text-foreground line-clamp-2 break-words">{shop.name}</p>
              <div className="flex items-start gap-1.5 mt-auto">
                {shop.rating != null && shop.rating > 0 && (
                  <span className="text-[10px] text-amber-500 font-semibold shrink-0">★ {Number(shop.rating).toFixed(1)}</span>
                )}
                <p className="line-clamp-2 min-w-0 text-[10px] leading-relaxed text-muted-foreground break-words">{shop.address || shop.vertical || "Dubai"}</p>
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

  const [city, setCity] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem("orbit:last-geo");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.city) return parsed.city;
      }
    } catch {}
    return null;
  });

  // Resolve city from live GPS when available
  useEffect(() => {
    if (!currentLocation || isFallback) return;
    // Already resolved for this position? skip
    if (city && city !== "your area") return;
    
    import("@/lib/mapbox/geocoding").then(({ reverseGeocode }) => {
      reverseGeocode(currentLocation.lat, currentLocation.lng).then(res => {
        const place = res?.features?.[0];
        if (place) {
          const cityCtx = place.context?.find((c: any) => c.id?.startsWith("place"));
          const cityName = cityCtx?.text || place.text;
          if (cityName) {
            setCity(cityName);
            try { localStorage.setItem("orbit:last-geo", JSON.stringify({ city: cityName, country: "AE" })); } catch {}
          }
        }
      }).catch(() => {});
    });
  }, [currentLocation, isFallback, city]);

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
    () => getTopBanners({ country: countryCode, city, hour: globalCtx.localHour }, 3),
    [countryCode, city, globalCtx.localHour],
  );
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  useEffect(() => {
    if (contextBanners.length <= 1) return;
    const iv = setInterval(() => setActiveBannerIdx(i => (i + 1) % contextBanners.length), 5000);
    return () => clearInterval(iv);
  }, [contextBanners.length]);

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

        {/* ═══ Context Banners — Animated carousel ═══ */}
        {contextBanners.length > 0 && (
          <div className="mb-4 space-y-2">
            <AnimatePresence mode="wait">
              {contextBanners.slice(activeBannerIdx, activeBannerIdx + 1).map((banner) => (
                <motion.div
                  key={banner.id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <Link
                    to={banner.route || "/radar"}
                    className="relative block overflow-hidden rounded-2xl border border-border/15 p-4 active:scale-[0.98] transition-transform"
                    style={{ background: banner.gradient }}
                  >
                    {/* Animated glow overlay */}
                    {banner.glowColor && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `radial-gradient(ellipse at 80% 20%, ${banner.glowColor}, transparent 65%)`,
                        }}
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}

                    {/* Shimmer line */}
                    {banner.animation === "shimmer" && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: "linear-gradient(105deg, transparent 40%, hsla(0,0%,100%,0.08) 50%, transparent 60%)",
                        }}
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                      />
                    )}

                    <div className="relative z-10">
                      <p className="text-sm font-extrabold leading-snug text-white drop-shadow-sm">
                        {banner.emoji} {banner.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-white/75 line-clamp-2 font-medium">{banner.subtitle}</p>
                      {banner.cta && (
                        <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                          {banner.cta} <ChevronRight className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>

          </div>
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
