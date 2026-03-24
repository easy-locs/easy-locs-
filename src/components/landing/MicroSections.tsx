/**
 * MicroSections — High-density micro content strips.
 * "Open Now", "Near You", "Top Pizza", etc.
 * Adds alive feeling between major sections.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Star, Clock, MapPin, ArrowRight, Flame, Zap } from "lucide-react";
import { useHomeSections } from "@/hooks/useHomeSections";

const TOP_CUISINES = [
  { label: "Top Pizza", emoji: "🍕", to: "/food?sub=pizza", count: "320+ restaurants" },
  { label: "Best Sushi", emoji: "🍣", to: "/food?sub=sushi", count: "180+ spots" },
  { label: "Burger Joints", emoji: "🍔", to: "/food?sub=burger", count: "410+ places" },
  { label: "Shawarma", emoji: "🌯", to: "/food?sub=shawarma", count: "260+ shops" },
  { label: "Fresh Coffee", emoji: "☕", to: "/food?sub=coffee", count: "520+ cafés" },
  { label: "Bakeries", emoji: "🥐", to: "/food?sub=bakery", count: "190+ bakeries" },
];

export function OpenNowStrip() {
  return (
    <div className="py-6 bg-card/30 border-y border-border/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs font-bold text-green-500 uppercase tracking-wider">Open Now</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Delivering to your area</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TOP_CUISINES.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/20 bg-card/60 hover:border-accent/30 hover:bg-accent/5 transition-all"
            >
              <span className="text-lg">{c.emoji}</span>
              <div>
                <p className="text-xs font-bold text-foreground">{c.label}</p>
                <p className="text-[9px] text-muted-foreground">{c.count}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NearYouStrip() {
  const { data } = useHomeSections();
  const nearby = data?.nearYou ?? [];
  if (nearby.length === 0) return null;

  return (
    <div className="py-6 bg-card/30 border-y border-border/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            <span className="text-sm font-bold text-foreground">Near You</span>
            <span className="px-1.5 py-0.5 rounded-md bg-accent/10 text-[9px] font-bold text-accent">
              {nearby.length}
            </span>
          </div>
          <Link to="/radar" className="text-[10px] font-semibold text-accent flex items-center gap-0.5">
            View map <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {nearby.slice(0, 6).map((shop) => (
            <Link
              key={shop.id}
              to={`/s/${shop.slug}`}
              className="shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border/20 bg-card/80 hover:border-accent/30 transition-all min-w-[180px]"
            >
              <div className="w-9 h-9 rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <Flame className="h-4 w-4 text-muted-foreground/30" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{shop.name}</p>
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                  {shop.rating > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                      <Star className="h-2.5 w-2.5 fill-amber-500" />
                      {Number(shop.rating).toFixed(1)}
                    </span>
                  )}
                  {shop.distanceKm != null && (
                    <span>{shop.distanceKm.toFixed(1)} km</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function QuickStatsBar() {
  return (
    <div className="py-4 border-y border-border/10 bg-accent/[0.02]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
          {[
            { value: "10K+", label: "Businesses", icon: Flame },
            { value: "190+", label: "Countries", icon: MapPin },
            { value: "4.8", label: "Avg Rating", icon: Star },
            { value: "< 3 min", label: "Avg Pickup", icon: Zap },
          ].map((s) => (
            <motion.div
              key={s.label}
              className="flex items-center gap-2 text-center"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <s.icon className="h-4 w-4 text-accent" />
              <div>
                <span className="text-sm font-extrabold text-foreground">{s.value}</span>
                <span className="text-[9px] text-muted-foreground ml-1">{s.label}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
