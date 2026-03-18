/**
 * SmartHome — Premium super-app home.
 * Dense, action-first, contextual, visually powerful.
 */
import { memo, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Bell, Wallet, QrCode, Send, ChevronRight, Star, Clock } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { getSmartCategories, getSmartHero, getTimeGreeting, getSmartSections, getTimeSlot, type SmartCategory } from "@/lib/smart-home-engine";
import { motion } from "framer-motion";

/* ═══ Compact Header ═══ */
const CompactHeader = memo(({ city, greeting, onSearch }: { city: string | null; greeting: string; onSearch: () => void }) => {
  const engine = useOrbitEngine();
  return (
    <div className="flex items-center gap-2 mb-2">
      <Link to="/dashboard/settings" className="flex items-center gap-1.5 min-w-0 shrink">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground leading-none">{greeting}</p>
          <p className="text-xs font-bold text-foreground truncate">{city || "Set location"}</p>
        </div>
      </Link>
      <button
        onClick={onSearch}
        className="flex-1 flex items-center gap-2 h-8 px-3 rounded-xl bg-muted/40 border border-border/20 text-muted-foreground text-[11px] active:scale-[0.97] transition-transform"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-primary/60" />
        <span className="truncate">Search anything…</span>
      </button>
      <Link to="/dashboard/notifications" className="relative shrink-0 w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center active:scale-95 transition-transform">
        <Bell className="h-3.5 w-3.5 text-foreground" />
        {engine.pendingNotifications > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground flex items-center justify-center px-0.5">
            {engine.pendingNotifications > 9 ? "9+" : engine.pendingNotifications}
          </span>
        )}
      </Link>
    </div>
  );
});

/* ═══ Quick Actions Strip ═══ */
const QuickActions = memo(() => (
  <div className="flex items-center gap-1.5 mb-3">
    {[
      { icon: QrCode, label: "Scan", to: "/dashboard/wallet?action=scan" },
      { icon: Send, label: "Pay", to: "/dashboard/wallet?action=pay" },
      { icon: Wallet, label: "Wallet", to: "/dashboard/wallet" },
    ].map(({ icon: Icon, label, to }) => (
      <Link
        key={label}
        to={to}
        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-border/15 bg-card/50 active:scale-95 active:bg-primary/5 transition-all"
      >
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-foreground">{label}</span>
      </Link>
    ))}
  </div>
));

/* ═══ Featured Category Card (wide) ═══ */
function FeaturedCategoryCard({ cat, index }: { cat: SmartCategory; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 * index, duration: 0.25 }}
      className="col-span-2"
    >
      <Link
        to={cat.route}
        className="group flex items-center gap-3 rounded-2xl p-3 h-full active:scale-[0.97] transition-all duration-150 border border-border/10 relative overflow-hidden"
        style={{ background: `color-mix(in srgb, ${cat.color} 10%, hsl(var(--card)))` }}
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{ background: `radial-gradient(circle at 80% 50%, ${cat.color}, transparent 70%)` }} />
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative z-10" style={{ background: `color-mix(in srgb, ${cat.color} 15%, transparent)` }}>
          <span className="text-2xl">{cat.icon}</span>
        </div>
        <div className="min-w-0 relative z-10 flex-1">
          <p className="text-sm font-bold text-foreground leading-tight">{cat.label}</p>
          {cat.subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{cat.subtitle}</p>}
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-active:translate-x-0.5 transition-transform" />
      </Link>
    </motion.div>
  );
}

/* ═══ Standard Category Card ═══ */
function CategoryCard({ cat, index }: { cat: SmartCategory; index: number }) {
  if (cat.size === "wide") return <FeaturedCategoryCard cat={cat} index={index} />;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 * index, duration: 0.25 }}
      className="col-span-1"
    >
      <Link
        to={cat.route}
        className="group flex flex-col items-center gap-1 rounded-xl p-2.5 active:scale-[0.95] transition-all duration-150 border border-border/10 relative overflow-hidden"
        style={{ background: `color-mix(in srgb, ${cat.color} 6%, hsl(var(--card)))` }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${cat.color} 12%, transparent)` }}>
          <span className="text-xl">{cat.icon}</span>
        </div>
        <p className="text-[11px] font-semibold text-foreground leading-tight text-center">{cat.label}</p>
        {cat.subtitle && <p className="text-[9px] text-muted-foreground leading-none">{cat.subtitle}</p>}
      </Link>
    </motion.div>
  );
}

/* ═══ Context-Aware Hero ═══ */
function SmartHeroCard({ timezone }: { timezone?: string }) {
  const hero = getSmartHero(timezone);
  const slot = getTimeSlot(timezone);
  const isNight = slot === "latenight" || slot === "dinner";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="mb-3"
    >
      <Link
        to={hero.route}
        className="block rounded-2xl p-3.5 relative overflow-hidden active:scale-[0.98] transition-transform"
        style={{ background: hero.gradient }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3 w-3 text-white/60" />
              <p className="text-white/70 text-[10px] font-medium uppercase tracking-wider">{hero.subtitle}</p>
            </div>
            <h2 className="text-white text-base font-black leading-tight mb-2">{hero.title}</h2>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[11px] font-bold active:bg-white/30 transition-colors">
              {hero.cta} <ChevronRight className="h-3 w-3" />
            </span>
          </div>
          <span className="text-4xl opacity-40 select-none ml-2">{hero.emoji}</span>
        </div>
        {isNight && <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />}
      </Link>
    </motion.div>
  );
}

/* ═══ Dynamic Section with richer cards ═══ */
function DynamicSection({ section, index }: { section: { key: string; title: string; icon: string }; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.04 }}
      className="mb-3"
    >
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-1">
          <span>{section.icon}</span> {section.title}
        </h3>
        <Link to="/discover" className="text-[10px] font-medium text-primary flex items-center gap-0.5 active:opacity-70">
          See all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[1, 2, 3].map(i => (
          <div key={i} className="shrink-0 w-32 rounded-xl border border-border/15 bg-card/50 overflow-hidden">
            <div className="h-16 bg-muted/20 flex items-center justify-center">
              <Star className="h-4 w-4 text-muted-foreground/20" />
            </div>
            <div className="p-2">
              <div className="h-2 w-3/4 bg-muted/30 rounded mb-1" />
              <div className="h-1.5 w-1/2 bg-muted/20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══ Utility Row ═══ */
const UtilityRow = memo(() => (
  <div className="mb-2">
    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1.5">Business & Tools</h3>
    <div className="grid grid-cols-4 gap-1.5">
      {[
        { icon: "🏠", label: "Property", to: "/property-hub" },
        { icon: "📊", label: "Analytics", to: "/dashboard/seller" },
        { icon: "🏪", label: "My Shop", to: "/dashboard/my-shop" },
        { icon: "🤖", label: "AI", to: "/dashboard/assistant" },
      ].map(item => (
        <Link
          key={item.label}
          to={item.to}
          className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-card/30 border border-border/10 active:scale-95 transition-transform"
        >
          <span className="text-base">{item.icon}</span>
          <span className="text-[9px] font-medium text-muted-foreground">{item.label}</span>
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
  const sections = useMemo(() => getSmartSections(timezone), [timezone]);

  return (
    <div className="space-y-0">
      <CompactHeader
        city={geo.effectiveCity || geo.manualCity}
        greeting={greeting}
        onSearch={() => navigate("/discover")}
      />
      <QuickActions />
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {categories.map((cat, i) => (
          <CategoryCard key={cat.key} cat={cat} index={i} />
        ))}
      </div>
      <SmartHeroCard timezone={timezone} />
      {sections.slice(0, 3).map((sec, i) => (
        <DynamicSection key={sec.key} section={sec} index={i} />
      ))}
      <UtilityRow />
    </div>
  );
}
