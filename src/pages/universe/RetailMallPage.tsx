/**
 * RetailMallPage — Browse shops by mall.
 * Route: /shop/mall/:mallSlug
 */
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Store } from "lucide-react";
import { motion } from "framer-motion";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";
import SEOHead from "@/components/SEOHead";

const MALLS = [
  { slug: "dubai-mall", name: "Dubai Mall", city: "Dubai", emoji: "🏬", address: "Downtown Dubai", lat: 25.1972, lng: 55.2795 },
  { slug: "mall-of-the-emirates", name: "Mall of the Emirates", city: "Dubai", emoji: "🏔️", address: "Al Barsha, Sheikh Zayed Rd", lat: 25.1181, lng: 55.2005 },
  { slug: "dubai-hills-mall", name: "Dubai Hills Mall", city: "Dubai", emoji: "🌿", address: "Dubai Hills Estate", lat: 25.1377, lng: 55.2409 },
  { slug: "ibn-battuta-mall", name: "Ibn Battuta Mall", city: "Dubai", emoji: "🌍", address: "Jebel Ali", lat: 25.0441, lng: 55.1195 },
  { slug: "city-centre-mirdif", name: "City Centre Mirdif", city: "Dubai", emoji: "🛍️", address: "Mirdif", lat: 25.2175, lng: 55.4025 },
  { slug: "dubai-marina-mall", name: "Dubai Marina Mall", city: "Dubai", emoji: "⛵", address: "Dubai Marina", lat: 25.0757, lng: 55.1387 },
];

const shopsCategory = CATEGORY_TREE.find(c => c.key === "shops")!;
const CLUSTERS = [...new Set(shopsCategory.subcategories.map(s => s.cluster))];

export default function RetailMallPage() {
  const { mallSlug } = useParams<{ mallSlug: string }>();
  const navigate = useNavigate();

  const mall = MALLS.find(m => m.slug === mallSlug);

  if (!mall) {
    return (
      <div className="app-mobile-page flex flex-col items-center justify-center bg-background px-6">
        <p className="text-lg font-bold text-foreground mb-2">Mall not found</p>
        <button onClick={() => navigate("/browse/shops")} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
          <ArrowLeft className="h-4 w-4" /> Back to Shops
        </button>
      </div>
    );
  }

  // Group subcategories by cluster for display
  const clusterGroups = CLUSTERS.map(cluster => ({
    cluster,
    label: cluster.charAt(0).toUpperCase() + cluster.slice(1).replace(/_/g, " "),
    subs: shopsCategory.subcategories.filter(s => s.cluster === cluster),
  })).filter(g => g.subs.length > 0);

  return (
    <div className="app-mobile-page bg-background">
      <SEOHead title={`${mall.name} — Easy-Locs`} description={`Browse stores at ${mall.name}, ${mall.city}`} />

      {/* Hero */}
      <div className="relative h-48 overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl mb-2">{mall.emoji}</motion.span>
          <motion.h1 initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-2xl font-bold" style={{ color: "hsl(var(--primary-foreground))" }}>
            {mall.name}
          </motion.h1>
          <motion.p initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-sm flex items-center gap-1 mt-1" style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>
            <MapPin className="h-3.5 w-3.5" /> {mall.address}
          </motion.p>
        </div>
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 rounded-xl bg-black/20 backdrop-blur-sm">
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Category sections */}
      <div className="px-4 py-5 space-y-6">
        {clusterGroups.map((group, gi) => (
          <motion.section key={group.cluster} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.08 }}>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">{group.label}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {group.subs.map(sub => (
                <Link
                  key={sub.value}
                  to={`/shop/category/${sub.value.replace(/_/g, "-")}`}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all active:scale-[0.97]"
                >
                  <span className="text-xl">{sub.emoji}</span>
                  <span className="text-sm font-medium text-foreground truncate">{sub.label}</span>
                </Link>
              ))}
            </div>
          </motion.section>
        ))}

        {/* Coming Soon */}
        <div className="text-center py-8">
          <Store className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">More stores coming to {mall.name}</p>
        </div>
      </div>
    </div>
  );
}
