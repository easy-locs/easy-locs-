/**
 * RetailIndexPage — /shop landing: malls + categories + featured stores.
 * Route: /shop
 */
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";
import SEOHead from "@/components/SEOHead";

const shopsCategory = CATEGORY_TREE.find(c => c.key === "shops")!;

const MALLS = [
  { slug: "dubai-mall", name: "Dubai Mall", emoji: "🏬", stores: "1200+" },
  { slug: "mall-of-the-emirates", name: "Mall of the Emirates", emoji: "🏔️", stores: "630+" },
  { slug: "dubai-hills-mall", name: "Dubai Hills Mall", emoji: "🌿", stores: "350+" },
  { slug: "ibn-battuta-mall", name: "Ibn Battuta Mall", emoji: "🌍", stores: "270+" },
  { slug: "city-centre-mirdif", name: "City Centre Mirdif", emoji: "🛍️", stores: "430+" },
  { slug: "dubai-marina-mall", name: "Dubai Marina Mall", emoji: "⛵", stores: "140+" },
];

const CLUSTERS = [...new Map(shopsCategory.subcategories.map(s => [s.cluster, s.cluster])).values()];

export default function RetailIndexPage() {
  const navigate = useNavigate();

  const clusterGroups = CLUSTERS.map(cluster => ({
    cluster,
    label: cluster.charAt(0).toUpperCase() + cluster.slice(1).replace(/_/g, " "),
    subs: shopsCategory.subcategories.filter(s => s.cluster === cluster),
  }));

  return (
    <div className="app-mobile-page bg-background">
      <SEOHead title="Shop — Easy-Locs" description="Browse retail stores, malls, and brands in Dubai" />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted/50">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">🛍️ Shop & Retail</h1>
      </header>

      <div className="px-4 py-5 space-y-8">
        {/* Malls section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">Explore by Mall</h2>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {MALLS.map((mall, i) => (
              <motion.div key={mall.slug} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Link
                  to={`/shop/mall/${mall.slug}`}
                  className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{mall.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{mall.name}</p>
                      <p className="text-xs text-muted-foreground">{mall.stores} stores</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Categories section */}
        {clusterGroups.map((group, gi) => (
          <motion.section key={group.cluster} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + gi * 0.06 }}>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">{group.label}</h2>
            <div className="flex overflow-x-auto scrollbar-none gap-2 pb-1 -mx-1 px-1 snap-x">
              {group.subs.map(sub => (
                <Link
                  key={sub.value}
                  to={`/shop/category/${sub.value.replace(/_/g, "-")}`}
                  className="flex-none flex flex-col items-center gap-1.5 w-20 py-3 px-2 rounded-2xl bg-card border border-border/40 hover:border-primary/30 transition-all snap-start active:scale-[0.95]"
                >
                  <span className="text-2xl">{sub.emoji}</span>
                  <span className="text-[11px] font-medium text-foreground text-center leading-tight line-clamp-2">{sub.label}</span>
                </Link>
              ))}
            </div>
          </motion.section>
        ))}

        {/* Browse all CTA */}
        <div className="text-center pb-6">
          <Link
            to="/browse/shops"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
            style={{ background: "var(--gradient-gold)", color: "hsl(var(--accent-foreground))" }}
          >
            Browse All Stores <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
