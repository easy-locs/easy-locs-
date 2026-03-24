/**
 * TrendingSection — Horizontal scroll of trending shops/services from real data.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star, TrendingUp, Flame } from "lucide-react";
import { useHomeSections } from "@/hooks/useHomeSections";

export default function TrendingSection() {
  const { data } = useHomeSections();
  const shops = data?.trending ?? [];

  return (
    <section className="py-10 sm:py-14 bg-background" aria-label="Trending">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="flex items-center justify-between mb-5"
        >
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Trending Now
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Popular on Easy-Locs right now
            </p>
          </div>
          <Link
            to="/radar"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-accent hover:gap-2 transition-all"
          >
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
          {/* Static showcase cards if no data yet */}
          {shops.length === 0 &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[200px] h-[220px] rounded-2xl bg-muted/30 animate-pulse"
              />
            ))}

          {shops.map((shop, i) => (
            <motion.div
              key={shop.id}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="snap-start shrink-0 w-[200px]"
            >
              <Link
                to={`/s/${shop.slug}`}
                className="group block rounded-2xl border border-border/20 bg-card overflow-hidden hover:shadow-lg hover:border-accent/30 transition-all duration-300"
              >
                <div className="aspect-[4/3] bg-muted/20 relative overflow-hidden">
                  {(shop.banner_url || shop.logo_url) ? (
                    <img
                      src={shop.banner_url || shop.logo_url!}
                      alt={shop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                  {i < 3 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-orange-500 text-white text-[9px] font-bold">
                      🔥 #{i + 1}
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-sm font-bold text-foreground truncate">{shop.name}</p>
                  <div className="flex items-center gap-1.5">
                    {shop.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                        <Star className="h-3 w-3 fill-amber-500" />
                        {Number(shop.rating).toFixed(1)}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground truncate">
                      {shop.vertical || shop.address || "Nearby"}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="sm:hidden text-center mt-3">
          <Link to="/radar" className="text-sm font-semibold text-accent">
            See all trending →
          </Link>
        </div>
      </div>
    </section>
  );
}
