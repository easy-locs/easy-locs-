/**
 * TrendingSection — Horizontal scroll of trending shops with LIVE badges, glass effects, depth.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star, TrendingUp, Flame, Zap } from "lucide-react";
import { useHomeSections } from "@/hooks/useHomeSections";

export default function TrendingSection() {
  const { data } = useHomeSections();
  const shops = data?.trending ?? [];

  return (
    <section className="py-10 sm:py-14 bg-background relative overflow-hidden" aria-label="Trending">
      {/* Subtle gradient orb */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/[0.03] blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="flex items-center justify-between mb-5"
        >
          <div className="flex items-center gap-3">
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
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Popular on Easy-Locs right now
              </p>
            </div>
          </div>
          <Link
            to="/radar"
            className="hidden sm:flex items-center gap-1 text-xs font-semibold text-accent hover:gap-2 transition-all"
          >
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
          {shops.length === 0 &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[185px] h-[210px] rounded-2xl bg-muted/30 animate-pulse"
              />
            ))}

          {shops.map((shop, i) => (
            <motion.div
              key={shop.id}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="snap-start shrink-0 w-[185px]"
            >
              <Link
                to={`/s/${shop.slug}`}
                className="group block rounded-2xl border border-border/10 bg-card overflow-hidden hover:shadow-xl hover:shadow-accent/5 hover:border-accent/20 transition-all duration-300"
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
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/5 to-muted/20">
                      <TrendingUp className="h-8 w-8 text-muted-foreground/15" />
                    </div>
                  )}
                  {/* Rank badge */}
                  {i < 3 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg backdrop-blur-md bg-black/40 border border-white/10 text-white text-[9px] font-bold flex items-center gap-1">
                      <Flame className="h-2.5 w-2.5 text-orange-400" /> #{i + 1}
                    </span>
                  )}
                  {/* Live indicator on some */}
                  {i % 3 === 0 && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md backdrop-blur-md bg-green-500/20 border border-green-500/20 text-[8px] font-bold text-green-400 flex items-center gap-0.5">
                      <Zap className="h-2 w-2" /> Open
                    </span>
                  )}
                  {/* Bottom gradient */}
                  <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <div className="p-2.5 space-y-1">
                  <p className="text-xs font-bold text-foreground truncate">{shop.name}</p>
                  <div className="flex items-center gap-1.5">
                    {shop.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold">
                        <Star className="h-2.5 w-2.5 fill-amber-500" />
                        {Number(shop.rating).toFixed(1)}
                      </span>
                    )}
                    <span className="text-[9px] text-muted-foreground truncate">
                      {shop.vertical || shop.address || "Nearby"}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="sm:hidden text-center mt-3">
          <Link to="/radar" className="text-xs font-semibold text-accent">
            See all trending →
          </Link>
        </div>
      </div>
    </section>
  );
}
