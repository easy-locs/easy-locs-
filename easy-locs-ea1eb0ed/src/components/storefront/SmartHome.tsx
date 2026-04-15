/**
 * SmartHome — Production-clean super-app home with data-driven sections.
 * Careem-style category grid with 3D icons + geo-aware delivery area.
 * Uses canonical discovery pipeline + Living Commerce Engine for all sections.
 * SINGLE SOURCE OF TRUTH: dashboard.view-model.ts → smart-home-engine.ts.
 *
 * ALL business logic is delegated to useDashboardViewModel.
 * This component is a PURE SHELL — render only.
 * Card system adoption: sections use LifecycleCardShell + UniverseCard via adapters.
 */
import { memo, useState, useEffect, useMemo, useCallback } from "react";
import { BoostSlotRenderer } from "@/components/boost/BoostSlotRenderer";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Wallet, QrCode, Send, ChevronRight, Star, Building2, Sparkles, TrendingUp, Zap, Brain, Clock, Activity, Coffee, UtensilsCrossed, Car, Package, RotateCcw, Heart, ShoppingBag } from "lucide-react";
import PillarPage, { PageSection } from "@/components/layout/PillarPage";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";
import { motion, AnimatePresence } from "framer-motion";
import { FALLBACK_HOTELS } from "@/data/fallback-hotels";
import { AddressSelectorSheet } from "@/components/address/AddressSelectorSheet";
import StoryPreviewRail from "@/components/stories/StoryPreviewRail";
import { useStoryFeed } from "@/hooks/useStoryFeed";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useDashboardViewModel } from "@/families/dashboard/dashboard.view-model";
import { LifecycleCardShell } from "@/components/cards/LifecycleCardShell";
import { UniverseCard } from "@/components/cards/UniverseCard";
import {
  useTrendingSectionCard,
  useBestRatedSectionCard,
  useNewestSectionCard,
  useNearYouSectionCard,
} from "@/domains/cards/adapters/home-card-adapters";
import type { SmartCategory, SmartHero } from "@/lib/smart-home-engine";
import { useI18n } from "@/lib/i18n";
import OrbitPreviewWidget from "@/components/dashboard/OrbitPreviewWidget";
import PropertyDashboardWidget from "@/components/dashboard/PropertyDashboardWidget";
import EssentialServicesStrip from "@/components/dashboard/EssentialServicesStrip";
import { ServiceMenuGrid, ServiceMenuDrawer } from "@/components/menu";
import LiveTrackingBanner from "@/components/dashboard/LiveTrackingBanner";
import { useDashboardLiveStats } from "@/hooks/useDashboardLiveStats";
import { prefetchForRoute } from "@/lib/smart-prefetch";
import { useCart } from "@/hooks/useCart";
import { useSmartInsights } from "@/hooks/useSmartInsights";
import SmartSuggestions from "@/components/dashboard/SmartSuggestions";
import ContinueSection from "@/components/dashboard/ContinueSection";
import SuggestedPaymentsSection from "@/components/dashboard/SuggestedPaymentsSection";
import PendingActionsSection from "@/components/dashboard/PendingActionsSection";
import ContextualNudge from "@/components/dashboard/ContextualNudge";
import C2CSmartBanner from "@/components/dashboard/C2CSmartBanner";
import { useDashboardIntelligence } from "@/hooks/useDashboardIntelligence";
import { computeProfileCompletion } from "@/lib/dashboard/dashboard-intelligence";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useWalletBalance } from "@/payments/wallet-hooks";
import RadarPreviewWidget from "@/components/dashboard/RadarPreviewWidget";
import RadarExplorerDrawer from "@/components/dashboard/RadarExplorerDrawer";
import { useDashboardRadar } from "@/hooks/useDashboardRadar";
import { useSmartNavigation } from "@/hooks/useSmartNavigation";
import PillarOverlayHost from "@/components/overlays/PillarOverlayHost";
import { useNavigationStateMachine } from "@/stores/navigationStateMachine";
import IntelligenceTicker from "@/components/dashboard/IntelligenceTicker";
import ForexWidget from "@/components/dashboard/ForexWidget";
import EngineHealthWidget from "@/components/dashboard/EngineHealthWidget";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import { isFeatureEnabled } from "@/lib/control-plane/kill-switches";

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
import { getDashboardHeroCategories, getDashboardCategoryImageKeys } from "@/lib/taxonomy/wiring-helpers";
import { MODULE_WIRING } from "@/lib/taxonomy/module-wiring";

const CATEGORY_IMAGE_ASSETS: Record<string, string> = {
  food: foodImg, grocery: groceryImg, shops: shopsImg, services: servicesImg,
  taxi: taxiImg, delivery: deliveryImg, property: propertyImg,
  beauty: beautyImg, travel: travelImg, health: pharmacyImg,
};

const CATEGORY_IMAGES: Record<string, string> = (() => {
  const images: Record<string, string> = {};
  for (const key of getDashboardCategoryImageKeys()) {
    if (CATEGORY_IMAGE_ASSETS[key]) images[key] = CATEGORY_IMAGE_ASSETS[key];
  }
  return images;
})();

const HERO_CATEGORIES = getDashboardHeroCategories();

/* ═══ Top Hero Banner — Premium super-app hero ═══ */
const TopHeroBanner = memo(({ hero, locationLabel, onLocationTap, t }: { hero: SmartHero; locationLabel: string; onLocationTap: () => void; t: (k: string) => string }) => (
  <div className="relative overflow-hidden rounded-2xl pt-3 pb-4 px-4 page-hero" style={{ background: "var(--gradient-hero)" }}>
    <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
      <button onClick={onLocationTap} className="flex min-w-0 max-w-[78%] items-center gap-2 active:opacity-70 transition-opacity">
        <MapPin className="h-4 w-4 shrink-0 text-white/50" />
        <span className="text-xs font-medium break-words line-clamp-2 leading-snug text-left text-white/70">{locationLabel}</span>
      </button>
      <div className="shrink-0">
        <NotificationBell />
      </div>
    </div>

    <div className="relative z-10 mb-3">
      <h1 className="text-lg font-bold leading-tight text-white">{hero.title}</h1>
      <p className="mt-1 text-xs leading-relaxed max-w-[280px] text-white/55">{hero.subtitle}</p>
    </div>

    <div className="relative z-10 mb-3">
      <UnifiedSearchBar variant="fullscreen" />
    </div>

    <div className="relative z-10 flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
      {HERO_CATEGORIES.map((cat) => (
        <Link
          key={cat.labelKey}
          to={cat.route}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl shrink-0 active:opacity-70 transition-opacity"
          style={{ background: "hsl(0 0% 100% / 0.06)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
        >
          <span className="text-sm">{cat.emoji}</span>
          <span className="text-[11px] font-bold text-white/85">{t(cat.labelKey) || cat.fallback}</span>
        </Link>
      ))}
    </div>
  </div>
));

/* ═══ Active Cart Banner — Resume ordering in 1 tap ═══ */
const ActiveCartBanner = memo(() => {
  const { t } = useI18n();
  const { cart, total, itemCount } = useCart();
  const navigate = useNavigate();
  if (itemCount === 0) return null;
  return (
    <motion.button
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate("/checkout")}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.98] transition-transform"
      style={{ marginBottom: "var(--section-gap)", background: "linear-gradient(135deg, hsl(226 24% 12%), hsl(226 24% 16%))", border: "1px solid hsl(0 0% 100% / 0.06)" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--accent) / 0.15)" }}>
        <ShoppingBag className="w-4.5 h-4.5" style={{ color: "hsl(var(--accent))" }} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-xs font-bold text-white truncate">{cart.restaurantName || t("home.your_order") || "Your order"}</p>
        <p className="text-[10px] text-white/60">{itemCount} {t("home.items_in_cart") || "item(s) in cart"}</p>
      </div>
      <span className="text-xs font-extrabold shrink-0 tabular-nums" style={{ color: "hsl(var(--accent))" }}>
        {t("home.checkout") || "Checkout"} →
      </span>
    </motion.button>
  );
});

/* ═══ Smart Quick Actions — Time & context-aware ═══ */
type QuickDef = { icon: typeof QrCode; labelKey: string; to: string; color: string };

const CORE_ACTIONS: QuickDef[] = (() => {
  const financeActions = MODULE_WIRING.finance.dashboard.quickActions;
  const actionMap: Record<string, { icon: typeof QrCode; color: string }> = {
    "/wallet": { icon: Wallet, color: "from-emerald-500/15 to-green-500/8" },
    "/wallet/transfer": { icon: Send, color: "from-blue-500/15 to-cyan-500/8" },
    "/pay/scan": { icon: QrCode, color: "from-violet-500/15 to-purple-500/8" },
  };
  return [
    { icon: QrCode, labelKey: "home.scan", to: "/pay/scan", color: "from-violet-500/15 to-purple-500/8" },
    ...financeActions
      .filter(a => actionMap[a.route])
      .map(a => ({
        icon: actionMap[a.route].icon,
        labelKey: `home.${a.label.toLowerCase().replace(/\s+/g, "_")}`,
        to: a.route,
        color: actionMap[a.route].color,
      })),
  ].slice(0, 3);
})();

const CONTEXT_ACTIONS: Record<string, QuickDef> = {
  coffee: { icon: Coffee, labelKey: "home.qa_coffee", to: "/browse/food?q=coffee", color: "from-amber-500/15 to-orange-500/8" },
  food: { icon: UtensilsCrossed, labelKey: "home.qa_food", to: "/browse/food", color: "from-red-500/15 to-orange-500/8" },
  taxi: { icon: Car, labelKey: "home.qa_ride", to: "/mobility/taxi", color: "from-sky-500/15 to-blue-500/8" },
  delivery: { icon: Package, labelKey: "home.qa_delivery", to: "/browse/food?mode=delivery", color: "from-teal-500/15 to-emerald-500/8" },
  reorder: { icon: RotateCcw, labelKey: "home.qa_reorder", to: "/my-orders", color: "from-pink-500/15 to-rose-500/8" },
};

function getSmartActions(): QuickDef[] {
  const hour = new Date().getHours();
  const base = [...CORE_ACTIONS];

  if (hour >= 5 && hour < 11) {
    base.push(CONTEXT_ACTIONS.coffee);
  } else if (hour >= 11 && hour < 15) {
    base.push(CONTEXT_ACTIONS.food);
  } else if (hour >= 17 && hour < 21) {
    base.push(CONTEXT_ACTIONS.food);
  } else if (hour >= 21 || hour < 5) {
    base.push(CONTEXT_ACTIONS.taxi);
  } else {
    base.push(CONTEXT_ACTIONS.delivery);
  }

  return base;
}

function SmartQuickActions() {
  const { t } = useI18n();
  const actions = useMemo(() => getSmartActions(), []);

  return (
    <div className="flex items-center gap-2" style={{ marginBottom: "var(--section-gap)" }}>
      {actions.map(({ icon: Icon, labelKey, to, color }) => (
        <Link
          key={labelKey}
          to={to}
          className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br ${color} border border-border/10 backdrop-blur-xl px-2 active:scale-[0.95] transition-all min-w-0`}
        >
          <Icon className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-[10px] font-bold text-foreground leading-tight min-w-0 break-words" style={{ wordBreak: "break-word", maxWidth: "100%" }}>{t(labelKey)}</span>
        </Link>
      ))}
    </div>
  );
}

/* ═══ Favorites & Reorder Strip — 1-tap access ═══ */
const QuickAccessStrip = memo(() => {
  const { t } = useI18n();
  const links = useMemo(() => [
    { icon: RotateCcw, label: t("home.qa_reorder") || "Reorder", to: "/my-orders", color: "hsl(340 65% 55%)" },
    { icon: Heart, label: t("home.qa_favorites") || "Favorites", to: "/favorites", color: "hsl(0 72% 58%)" },
    { icon: ShoppingBag, label: t("home.qa_my_orders") || "My Orders", to: "/my-orders/active", color: "hsl(var(--accent))" },
  ], [t]);

  return (
    <div className="flex items-center gap-2" style={{ marginBottom: "var(--section-gap-compact)" }}>
      {links.map(({ icon: Icon, label, to, color }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-1 items-center gap-1.5 px-3 py-2.5 rounded-xl active:scale-[0.95] transition-all"
          style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.08)" }}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
          <span className="text-[10px] font-bold text-foreground truncate">{label}</span>
        </Link>
      ))}
    </div>
  );
});

/* ═══ AI Smart Insights — Live intelligence bar ═══ */
const AISmartInsights = memo(() => {
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);
  const insights = useMemo(() => {
    const hour = new Date().getHours();
    const base = [
      { text: t("home.ai_new_restaurants").replace("{count}", "12"), icon: Sparkles, color: "text-violet-400" },
      { text: t("home.ai_wallet_savings").replace("{amount}", "AED 47"), icon: TrendingUp, color: "text-emerald-400" },
      { text: t("home.ai_properties_match").replace("{count}", "3"), icon: Zap, color: "text-amber-400" },
      { text: t("home.ai_smart_route").replace("{pct}", "18"), icon: Brain, color: "text-blue-400" },
    ];
    if (hour >= 11 && hour <= 14) base.unshift({ text: t("home.ai_lunch_rush").replace("{count}", "8"), icon: Clock, color: "text-orange-400" });
    if (hour >= 18 && hour <= 22) base.unshift({ text: t("home.ai_dinner_free"), icon: Star, color: "text-yellow-400" });
    if (hour >= 22 || hour < 5) base.unshift({ text: t("home.ai_late_night").replace("{count}", "24"), icon: Activity, color: "text-purple-400" });
    return base;
  }, [t]);

  useEffect(() => {
    const timer = setInterval(() => setIdx((p) => (p + 1) % insights.length), 4000);
    return () => clearInterval(timer);
  }, [insights.length]);

  const insight = insights[idx];
  const Icon = insight.icon;

  return (
    <div
      className="overflow-hidden rounded-xl border border-border/10 bg-card"
      style={{ marginBottom: "var(--section-gap-compact)" }}
    >
      <div className="px-3.5 py-2.5">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2.5"
          >
            <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: "hsl(var(--accent) / 0.08)" }}>
              <Icon className={`h-3.5 w-3.5 ${insight.color}`} />
            </div>
            <p className="text-[11px] font-medium text-foreground/80 leading-snug flex-1">{insight.text}</p>
            <Brain className="h-3 w-3 text-muted-foreground/30 shrink-0" />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
});


/* ═══ Category Card — Full-width grid ═══ */
const CategoryCard = memo(function CategoryCard({ cat, index }: { cat: SmartCategory; index: number }) {
  const imgSrc = cat.image ? CATEGORY_IMAGES[cat.image] : null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.03 * index, type: "spring", stiffness: 500, damping: 30 }}
      className="shrink-0"
    >
      <Link
        to={cat.route}
        className="group relative flex flex-col items-center justify-center overflow-hidden rounded-xl p-2 w-[76px] min-h-[76px] transition-transform duration-150 active:scale-[0.95]"
        style={{ background: "hsl(var(--muted) / 0.15)", border: "1px solid hsl(var(--border) / 0.08)" }}
      >
        <div className="flex items-center justify-center mb-1 shrink-0">
          {imgSrc ? (
            <img src={imgSrc} alt={cat.label} className="h-8 w-8 object-contain drop-shadow-md" loading="lazy" />
          ) : (
            <span className="text-xl">{cat.icon}</span>
          )}
        </div>
        <p className="w-full text-center text-[10px] font-semibold leading-snug text-foreground line-clamp-2 break-words">{cat.label}</p>
      </Link>
    </motion.div>
  );
});

/* ═══ Data-Driven Section — Now uses LifecycleCardShell + UniverseCard ═══ */
interface ShopSummary {
  id: string;
  name: string;
  slug: string;
  address?: string;
  vertical?: string;
  banner_url?: string;
  logo_url?: string;
  rating?: number;
}

const AdapterSection = memo(function AdapterSection({ title, icon, cardStatus, shops, seeAllTo, onSeeAll }: {
  title: string;
  icon: string;
  cardStatus: import("@/domains/cards/card-contract").CardStatus;
  shops: ShopSummary[];
  seeAllTo: string;
  onSeeAll?: () => void;
}) {
  const { t } = useI18n();
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="page-section" style={{ marginBottom: "var(--section-gap)" }}>
      <div className="page-section__header">
        <div className="page-section__title-group">
          <span className="page-section__icon">{icon}</span>
          <h2 className="page-section__title">{title}</h2>
        </div>
        {onSeeAll ? (
          <button onClick={onSeeAll} className="page-section__action-btn">
            {t("home.see_all")} <ChevronRight className="h-3 w-3" />
          </button>
        ) : (
          <Link to={seeAllTo} className="page-section__action-btn">
            {t("home.see_all")} <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <LifecycleCardShell state={cardStatus} title={title} skeletonCount={3}>
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none px-1">
          {shops.map((shop) => (
            <UniverseCard
              key={shop.id}
              id={shop.id}
              title={shop.name}
              subtitle={shop.address || shop.vertical || t("home.fallback_location")}
              image={shop.banner_url || shop.logo_url}
              rating={shop.rating}
              to={`/s/${shop.slug}`}
            />
          ))}
        </div>
      </LifecycleCardShell>
    </motion.div>
  );
});
const HERO_SLIDE_DEFS = [
  { id: "slide-hotels", titleKey: "home.slide_hotels_title", subKey: "home.slide_hotels_sub", gradient: "linear-gradient(135deg, #44337a, #553c9a)", emoji: "🏨", ctaKey: "home.slide_hotels_cta", route: "/stay" },
  { id: "slide-food", titleKey: "home.slide_food_title", subKey: "home.slide_food_sub", gradient: "linear-gradient(135deg, #b7791f, #dd6b20)", emoji: "🍽️", ctaKey: "home.slide_food_cta", route: "/radar?vertical=restaurant" },
  { id: "slide-deals", titleKey: "home.slide_deals_title", subKey: "home.slide_deals_sub", gradient: "linear-gradient(135deg, #c53030, #e53e3e)", emoji: "🔥", ctaKey: "home.slide_deals_cta", route: "/radar?sort=trending" },
  { id: "slide-ride", titleKey: "home.slide_ride_title", subKey: "home.slide_ride_sub", gradient: "linear-gradient(135deg, #1a365d, #2d3748)", emoji: "🚗", ctaKey: "home.slide_ride_cta", route: "/mobility/taxi" },
];

const FeaturedHotelsCarousel = memo(() => {
  const { t } = useI18n();
  const top6 = FALLBACK_HOTELS.slice(0, 6);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="page-section" style={{ marginBottom: "var(--section-gap)" }}>
      <div className="page-section__header">
        <div className="page-section__title-group">
          <Building2 className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
          <h2 className="page-section__title">{t("home.featured_hotels")}</h2>
        </div>
        <Link to="/stay" className="page-section__action-btn">
          {t("home.see_all")} <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none px-1">
        {top6.map((hotel) => (
          <Link
            key={hotel.id}
            to={`/s/${hotel.slug}`}
            className="w-[170px] rounded-2xl overflow-hidden border border-border/15 bg-card active:scale-[0.97] transition-transform shrink-0 flex flex-col card-lift"
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden shrink-0">
              <img src={hotel.banner_url} alt={hotel.name} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: "hsl(226 24% 14% / 0.7)", backdropFilter: "blur(4px)" }}>
                <Star className="h-2.5 w-2.5" style={{ fill: "hsl(var(--accent))", color: "hsl(var(--accent))" }} /> {hotel.rating}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-12" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }} />
              <p className="absolute bottom-1.5 left-2 right-2 text-[10px] font-bold text-white leading-tight line-clamp-1">{hotel.name}</p>
            </div>
            <div className="px-2.5 py-2 flex-1 flex flex-col gap-0.5">
              <p className="text-[11px] text-muted-foreground line-clamp-1 leading-snug">{hotel.region} · {hotel.stars}★</p>
              <p className="text-xs font-bold line-clamp-1" style={{ color: "hsl(var(--accent))" }}>{t("home.from_price").replace("{price}", `AED ${hotel.night_price}`)}</p>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
});

const HeroSlideCarousel = memo(() => {
  const { t } = useI18n();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDE_DEFS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const slide = HERO_SLIDE_DEFS[activeSlide];

  return (
    <div style={{ marginBottom: "var(--section-gap)" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Link
            to={slide.route}
            className="relative block overflow-hidden rounded-2xl active:scale-[0.98] transition-transform aspect-[2/1]"
            style={{ background: slide.gradient }}
          >
            <div className="absolute top-3 right-4 text-4xl opacity-30 select-none">{slide.emoji}</div>
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="text-base font-extrabold text-white leading-snug drop-shadow-md">{t(slide.titleKey)}</p>
              <p className="mt-0.5 text-xs text-white/90 leading-relaxed drop-shadow-sm">{t(slide.subKey)}</p>
              <span className="mt-2 self-start inline-flex items-center gap-1 rounded-full bg-white/20 px-3.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-md border border-white/15">
                {t(slide.ctaKey)} <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-center gap-1.5 mt-2" aria-hidden="true">
        {HERO_SLIDE_DEFS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveSlide(i)}
            className="rounded-full transition-all duration-300 ease-out"
            tabIndex={-1}
            style={{
              width: i === activeSlide ? 16 : 5,
              height: 5,
              background: i === activeSlide ? "hsl(var(--accent) / 0.7)" : "hsl(var(--muted-foreground) / 0.15)",
            }}
          />
        ))}
      </div>
    </div>
  );
});

const DashboardStories = memo(() => {
  const { t } = useI18n();
  const { data: forYouStories = [] } = useStoryFeed("dashboard_for_you");
  const { data: trendingStories = [] } = useStoryFeed("dashboard_trending");

  return (
    <>
      {forYouStories.length > 0 && (
        <StoryPreviewRail title={t("home.stories_for_you")} stories={forYouStories.slice(0, 12)} size="medium" feedKey="dashboard_for_you" surface="dashboard" />
      )}
      {trendingStories.length > 0 && (
        <StoryPreviewRail title={t("home.trending_nearby")} stories={trendingStories.slice(0, 8)} size="small" feedKey="dashboard_trending" surface="dashboard" />
      )}
    </>
  );
});

/* ═══ Main Component — PURE SHELL with Card System Adoption ═══ */
export default function SmartHome() {
  const { t } = useI18n();
  const vm = useDashboardViewModel();
  const { user } = useAuth();
  const orbitProfile = useOrbitIdentity();
  const { balance: walletBal } = useWalletBalance();

  const [radarDrawerOpen, setRadarDrawerOpen] = useState(false);
  const [drawerSort, setDrawerSort] = useState<string | undefined>();
  const radarData = useDashboardRadar(20);
  const { smartNavigate, overlayState, closeOverlay } = useSmartNavigation();
  const fsmSetSubState = useNavigationStateMachine((s) => s.setPillarSubState);

  useEffect(() => {
    if (radarDrawerOpen) {
      fsmSetSubState("DASHBOARD_INTERACTION");
    } else if (overlayState.activeOverlay) {
      fsmSetSubState("DASHBOARD_PREVIEW");
    } else {
      fsmSetSubState("DASHBOARD_IDLE");
    }
  }, [radarDrawerOpen, overlayState.activeOverlay, fsmSetSubState]);

  const openRadarDrawer = useCallback((sort?: string) => {
    setDrawerSort(sort);
    setRadarDrawerOpen(true);
  }, []);

  const smartContext = useMemo(() => ({
    hasShop: false,
    hasWallet: walletBal !== null && walletBal !== undefined,
    hasProfile: !!user,
    profileComplete: !!(user?.user_metadata?.display_name && user?.user_metadata?.avatar_url),
    hasOrbit: !!orbitProfile?.orbitId,
  }), [user, walletBal, orbitProfile?.orbitId]);

  const { suggestions, dismiss } = useSmartInsights(smartContext);

  const liveStats = useDashboardLiveStats();

  // Compute actual profile field completeness from available user metadata + live stats
  const profileFields = useMemo(() => ({
    hasName: !!(user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name),
    hasAvatar: !!(user?.user_metadata?.avatar_url || user?.user_metadata?.picture),
    hasPhone: !!(user?.user_metadata?.phone || user?.phone),
    hasDocuments: liveStats.hasDocuments,
    hasPaymentMethod: smartContext.hasWallet,
  }), [user, smartContext.hasWallet, liveStats.hasDocuments]);

  // Profile is considered "complete" when the computed percentage reaches 80%+
  // This replaces the legacy boolean that only checked display_name + avatar_url
  const profileCompletePct = useMemo(
    () => profileFields ? computeProfileCompletion(profileFields) : 0,
    [profileFields],
  );
  const profileComplete = profileCompletePct >= 80;

  const intelligence = useDashboardIntelligence({
    userId: user?.id || null,
    hasWallet: smartContext.hasWallet,
    walletBalance: liveStats.walletBalance,
    walletCurrency: liveStats.walletCurrency,
    unreadMessages: liveStats.unreadMessages,
    activeOrders: liveStats.activeOrders,
    hasProfile: smartContext.hasProfile,
    profileComplete,
    hasOrbit: smartContext.hasOrbit,
    profileFields,
  });



  useEffect(() => { prefetchForRoute("/"); }, []);

  const trendingCard = useTrendingSectionCard();
  const bestRatedCard = useBestRatedSectionCard();
  const newestCard = useNewestSectionCard();
  const nearYouCard = useNearYouSectionCard();

  return (
    <PillarPage noPadding className="pb-8">
      <div className="px-4 pt-4">
        <TopHeroBanner hero={vm.hero} locationLabel={vm.locationLabel} onLocationTap={vm.onLocationTap} t={t} />
        {isPlatformFlagEnabled("enable_global_intelligence") &&
         isPlatformFlagEnabled("enable_intelligence_ticker") &&
         isFeatureEnabled("intelligence_enabled") && (
          <IntelligenceTicker country={vm.countryCode || "AE"} city={vm.city ?? undefined} />
        )}
        <div className="flex items-center justify-between mb-2">
          <EngineHealthWidget />
        </div>
        <div className="flex flex-col gap-2" style={{ marginBottom: "var(--section-gap-compact)" }}>
          <ForexWidget countryCode={vm.countryCode || "AE"} />
        </div>
        <ActiveCartBanner />
        <SmartQuickActions />
        <ContextualNudge suggestion={intelligence.quickSuggestion} />
        <QuickAccessStrip />
        <ContinueSection items={intelligence.continueItems} />
        <PendingActionsSection actions={intelligence.pendingActions} />
        <AISmartInsights />
        <SmartSuggestions suggestions={suggestions} onDismiss={dismiss} />
        <C2CSmartBanner />
        <SuggestedPaymentsSection payments={intelligence.suggestedPayments} />
      </div>

      <OrbitPreviewWidget onNavigate={smartNavigate} />
      <PropertyDashboardWidget />

      <div className="px-4">
        <LiveTrackingBanner />

        <PageSection compact>
          <ServiceMenuGrid columns={4} maxItems={8} />
          <div className="flex justify-center" style={{ marginTop: 12 }}>
            <ServiceMenuDrawer />
          </div>
        </PageSection>

        <PageSection compact>
          <EssentialServicesStrip />
        </PageSection>

        <PageSection
          title={t("dashboard.browse_categories") || "Browse Categories"}
          icon={<span>🏪</span>}
          actionLabel={t("dashboard.see_all") || "See all"}
          onAction={() => {}}
          action={
            <Link to="/browse" className="page-section__action-btn">
              {t("dashboard.see_all") || "See all"} <ChevronRight className="h-3 w-3" />
            </Link>
          }
          noPaddingX
        >
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none" data-no-swipe>
            {vm.categories.map((cat, i) => <CategoryCard key={cat.key} cat={cat} index={i} />)}
          </div>
        </PageSection>

        {vm.contextBanners.length > 0 && (
          <div style={{ marginBottom: "var(--section-gap)" }}>
            <AnimatePresence mode="wait">
              {vm.contextBanners.slice(vm.activeBannerIdx, vm.activeBannerIdx + 1).map((banner) => (
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
                    {banner.glowColor && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at 80% 20%, ${banner.glowColor}, transparent 65%)` }}
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                    {banner.animation === "shimmer" && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: "linear-gradient(105deg, transparent 40%, hsla(0,0%,100%,0.08) 50%, transparent 60%)" }}
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

        <HeroSlideCarousel />

        <div style={{ marginBottom: "var(--section-gap)" }}>
          <BoostSlotRenderer surface="home" slotKey="hero_primary" variant="hero" />
        </div>
      </div>

      <RadarPreviewWidget
        onExploreMore={() => openRadarDrawer()}
        items={radarData.items}
        loading={radarData.loading}
        totalCount={radarData.totalCount}
      />

      <DashboardStories />

      <div className="px-4">
        <FeaturedHotelsCarousel />

        <AdapterSection
          title={t("home.section_trending")}
          icon="🔥"
          cardStatus={trendingCard.status}
          shops={vm.sections.trending}
          seeAllTo="/radar?sort=trending"
          onSeeAll={() => openRadarDrawer("trending")}
        />
        <AdapterSection
          title={t("home.section_best_rated")}
          icon="⭐"
          cardStatus={bestRatedCard.status}
          shops={vm.sections.bestRated}
          seeAllTo="/radar?sort=rating"
          onSeeAll={() => openRadarDrawer("best_rated")}
        />
        <AdapterSection
          title={t("home.section_newest")}
          icon="✨"
          cardStatus={newestCard.status}
          shops={vm.sections.newest}
          seeAllTo="/radar?sort=newest"
          onSeeAll={() => openRadarDrawer("smart")}
        />
        <AdapterSection
          title={t("home.section_near_you")}
          icon="📍"
          cardStatus={nearYouCard.status}
          shops={vm.sections.nearYou}
          seeAllTo="/radar?sort=distance"
          onSeeAll={() => openRadarDrawer("nearest")}
        />

        <div style={{ paddingBottom: 16 }}>
          <BoostSlotRenderer surface="home" slotKey="inline_banner_1" variant="inline" />
        </div>
      </div>

      <RadarExplorerDrawer
        open={radarDrawerOpen}
        onOpenChange={setRadarDrawerOpen}
        initialSort={drawerSort}
        items={radarData.items}
        loading={radarData.loading}
        totalCount={radarData.totalCount}
      />

      <PillarOverlayHost
        activeOverlay={overlayState.activeOverlay}
        overlayRoute={overlayState.overlayRoute}
        overlayContext={overlayState.overlayContext}
        onClose={closeOverlay}
      />

      <AddressSelectorSheet open={vm.addressSheetOpen} onOpenChange={vm.onAddressSheetChange} />
    </PillarPage>
  );
}
