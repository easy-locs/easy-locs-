/**
 * SmartHome — Redesigned super-app home.
 * Compact header, premium category cards, time-aware hero, dynamic sections.
 * Inspired by Careem/Zomato density but original Easy-Locs identity.
 */
import { memo, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Bell, Wallet, QrCode, Send, ChevronRight, Star } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { getSmartCategories, getSmartHero, getTimeGreeting, getSmartSections, type SmartCategory } from "@/lib/smart-home-engine";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { motion } from "framer-motion";

/* ═══ Compact Header ═══ */
const CompactHeader = memo(({ city, onSearch }: { city: string | null; onSearch: () => void }) => {
  const engine = useOrbitEngine();
  return (
    <div className="flex items-center gap-2 mb-3">
      {/* Location */}
      <Link to="/dashboard/settings" className="flex items-center gap-1.5 min-w-0 shrink">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground leading-none">Deliver to</p>
          <p className="text-xs font-bold text-foreground truncate">{city || "Set location"}</p>
        </div>
      </Link>
      {/* Search */}
      <button
        onClick={onSearch}
        className="flex-1 flex items-center gap-2 h-9 px-3 rounded-xl bg-muted/50 border border-border/30 text-muted-foreground text-xs active:scale-[0.98] transition-transform"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Search anything…</span>
      </button>
      {/* Notifications */}
      <Link to="/dashboard/notifications" className="relative shrink-0 w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center">
        <Bell className="h-4 w-4 text-foreground" />
        {engine.pendingNotifications > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground flex items-center justify-center px-0.5">
            {engine.pendingNotifications > 9 ? "9+" : engine.pendingNotifications}
          </span>
        )}
      </Link>
    </div>
  );
});

/* ═══ Quick Pay Bar ═══ */
const QuickActions = memo(() => (
  <div className="flex items-center gap-2 mb-4">
    {[
      { icon: QrCode, label: "Scan", to: "/dashboard/wallet?action=scan", color: "primary" },
      { icon: Send, label: "Pay", to: "/dashboard/wallet?action=pay", color: "primary" },
      { icon: Wallet, label: "Wallet", to: "/dashboard/wallet", color: "success" },
    ].map(({ icon: Icon, label, to, color }) => (
      <Link
        key={label}
        to={to}
        className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl border border-border/20 bg-card/60 active:scale-95 transition-transform"
      >
        <Icon className={`h-4 w-4 text-${color}`} />
        <span className="text-[11px] font-semibold text-foreground">{label}</span>
      </Link>
    ))}
  </div>
));

/* ═══ Premium Category Card ═══ */
function CategoryCard({ cat, index }: { cat: SmartCategory; index: number }) {
  const isWide = cat.size === "wide";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.3 }}
      className={isWide ? "col-span-2" : "col-span-1"}
    >
      <Link
        to={cat.route}
        className="group block rounded-2xl p-3 h-full active:scale-[0.96] transition-all duration-200 border border-border/15 relative overflow-hidden"
        style={{ background: `color-mix(in srgb, ${cat.color} 8%, hsl(var(--card)))` }}
      >
        {/* Glow */}
        <div
          className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-20 blur-xl"
          style={{ background: cat.color }}
        />
        <div className="relative z-10">
          <span className="text-2xl block mb-1">{cat.icon}</span>
          <p className="text-sm font-bold text-foreground leading-tight">{cat.label}</p>
          {cat.subtitle && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{cat.subtitle}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

/* ═══ Smart Hero ═══ */
function SmartHeroCard({ timezone }: { timezone?: string }) {
  const hero = getSmartHero(timezone);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="mb-4"
    >
      <Link
        to={hero.route}
        className="block rounded-2xl p-4 relative overflow-hidden active:scale-[0.98] transition-transform"
        style={{ background: hero.gradient, minHeight: 100 }}
      >
        <div className="relative z-10">
          <p className="text-white/80 text-xs font-medium mb-0.5">{hero.subtitle}</p>
          <h2 className="text-white text-lg font-black leading-tight mb-2">{hero.title}</h2>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold">
            {hero.cta} <ChevronRight className="h-3 w-3" />
          </span>
        </div>
        <span className="absolute right-4 bottom-2 text-5xl opacity-30 select-none">{hero.emoji}</span>
      </Link>
    </motion.div>
  );
}

/* ═══ Dynamic Section Placeholder ═══ */
function DynamicSection({ section, index }: { section: { key: string; title: string; icon: string }; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.05 }}
      className="mb-3"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <span>{section.icon}</span> {section.title}
        </h3>
        <Link to="/discover" className="text-[10px] font-medium text-primary flex items-center gap-0.5">
          See all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {/* Placeholder cards — will be replaced with real data rails */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="shrink-0 w-36 rounded-xl border border-border/20 bg-card/60 overflow-hidden"
          >
            <div className="h-20 bg-muted/30 flex items-center justify-center">
              <Star className="h-5 w-5 text-muted-foreground/30" />
            </div>
            <div className="p-2">
              <div className="h-2.5 w-3/4 bg-muted/40 rounded mb-1" />
              <div className="h-2 w-1/2 bg-muted/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══ Utility Row ═══ */
const UtilityRow = memo(() => (
  <div className="mb-3">
    <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Business & Tools</h3>
    <div className="grid grid-cols-4 gap-2">
      {[
        { icon: "🏠", label: "Property", to: "/property-hub" },
        { icon: "📊", label: "Analytics", to: "/dashboard/seller" },
        { icon: "🏪", label: "My Shop", to: "/dashboard/my-shop" },
        { icon: "🤖", label: "AI", to: "/dashboard/assistant" },
      ].map(item => (
        <Link
          key={item.label}
          to={item.to}
          className="flex flex-col items-center gap-1 p-2 rounded-xl bg-card/40 border border-border/10 active:scale-95 transition-transform"
        >
          <span className="text-lg">{item.icon}</span>
          <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
        </Link>
      ))}
    </div>
  </div>
));

/* ═══ Main Component ═══ */
export default function SmartHome() {
  const navigate = useNavigate();
  const geo = useGeolocation();
  const timezone = useMemo(() => {
    // Try to detect from country
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
  }, []);

  // Detect country from geo or fallback
  const countryCode = useMemo(() => {
    // Try cached manual city or read from localStorage
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
  const sections = useMemo(() => getSmartSections(timezone), [timezone]);

  return (
    <div className="space-y-0">
      {/* Compact Header */}
      <CompactHeader
        city={geo.effectiveCity || geo.manualCity}
        onSearch={() => navigate("/discover")}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* Premium Category Grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {categories.map((cat, i) => (
          <CategoryCard key={cat.key} cat={cat} index={i} />
        ))}
      </div>

      {/* Smart Hero */}
      <SmartHeroCard timezone={timezone} />

      {/* Dynamic Sections */}
      {sections.slice(0, 3).map((sec, i) => (
        <DynamicSection key={sec.key} section={sec} index={i} />
      ))}

      {/* Utility Row */}
      <UtilityRow />
    </div>
  );
}
