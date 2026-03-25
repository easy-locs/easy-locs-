/**
 * TrendingSection — Shows trending per VERTICAL. Never mixes food/hotel/services.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Flame, UtensilsCrossed, Building2, Wrench, ShoppingBag } from "lucide-react";
import { useHomeSections, type VerticalSection, type HomeShopPreview } from "@/hooks/useHomeSections";

const VERTICAL_CONFIG = [
  { key: "food", label: "Trending Food", icon: UtensilsCrossed, color: "text-orange-500", bg: "bg-orange-500/10", route: "/food" },
  { key: "hotel", label: "Trending Hotels", icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10", route: "/hotels" },
  { key: "services", label: "Trending Services", icon: Wrench, color: "text-emerald-500", bg: "bg-emerald-500/10", route: "/services" },
  { key: "grocery", label: "Trending Grocery", icon: ShoppingBag, color: "text-violet-500", bg: "bg-violet-500/10", route: "/grocery" },
] as const;

function ShopCard({ shop }: { shop: HomeShopPreview }) {
  return (
    <Link
      to={`/s/${shop.slug}`}
      className="snap-start shrink-0 w-[185px] group"
    >
      <div className="relative rounded-2xl overflow-hidden bg-card border border-border/30 h-[210px] flex flex-col">
        <div className="h-[120px] bg-muted/30 overflow-hidden">
          {shop.banner_url ? (
            <img src={shop.banner_url} alt={shop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <Flame className="w-8 h-8" />
            </div>
          )}
        </div>
        <div className="p-2.5 flex-1 flex flex-col justify-between">
          <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight">{shop.name}</p>
          <div className="flex items-center gap-1 mt-1">
            {shop.rating > 0 && (
              <>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-semibold text-foreground">{shop.rating.toFixed(1)}</span>
              </>
            )}
            {shop.distanceKm != null && (
              <span className="text-[10px] text-muted-foreground ml-auto">{shop.distanceKm.toFixed(1)} km</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function VerticalRow({ config, section }: { config: typeof VERTICAL_CONFIG[number]; section: VerticalSection }) {
  const shops = section.trending;
  if (shops.length === 0) return null;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl ${config.bg} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-foreground">{config.label}</h3>
          </div>
        </div>
        <Link to={config.route} className="flex items-center gap-1 text-[11px] font-semibold text-accent hover:gap-2 transition-all">
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
        {shops.map(shop => <ShopCard key={shop.id} shop={shop} />)}
      </div>
    </motion.div>
  );
}

export default function TrendingSection() {
  const { data } = useHomeSections();

  if (!data) {
    return (
      <section className="py-10 sm:py-14 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-3 overflow-x-auto pb-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="snap-start shrink-0 w-[185px] h-[210px] rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 sm:py-14 bg-background relative overflow-hidden" aria-label="Trending">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/[0.03] blur-[100px] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground flex items-center gap-2">
              Trending Now
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 text-[9px] font-bold text-green-500 uppercase">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </span>
                Live
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Popular on Easy-Locs right now</p>
          </div>
        </div>

        {VERTICAL_CONFIG.map(cfg => {
          const section = data[cfg.key as keyof typeof data] as VerticalSection | undefined;
          if (!section) return null;
          return <VerticalRow key={cfg.key} config={cfg} section={section} />;
        })}
      </div>
    </section>
  );
}
