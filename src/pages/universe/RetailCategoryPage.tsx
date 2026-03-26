/**
 * RetailCategoryPage — Browse retail shops by category slug.
 * Route: /shop/category/:categorySlug
 */
import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";
import { useVerticalListings } from "@/hooks/useVerticalListings";
import PremiumMerchantCard from "@/components/discovery/PremiumMerchantCard";
import SEOHead from "@/components/SEOHead";

const shopsCategory = CATEGORY_TREE.find(c => c.key === "shops")!;

export default function RetailCategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();

  const sub = useMemo(() => {
    const normalized = categorySlug?.replace(/-/g, "_");
    return shopsCategory.subcategories.find(
      s => s.value === normalized || s.label.toLowerCase().replace(/[\s&']/g, "-").replace(/-+/g, "-") === categorySlug
    );
  }, [categorySlug]);

  const { data: listings = [], isLoading } = useVerticalListings("shops", sub?.value ?? null);

  if (!sub) {
    return (
      <div className="app-mobile-page flex flex-col items-center justify-center bg-background px-6">
        <p className="text-lg font-bold text-foreground mb-2">Category not found</p>
        <button onClick={() => navigate("/browse/shops")} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
          <ArrowLeft className="h-4 w-4" /> Back to Shops
        </button>
      </div>
    );
  }

  return (
    <div className="app-mobile-page bg-background">
      <SEOHead title={`${sub.label} — Easy-Locs`} description={`Browse ${sub.label} stores and shops`} />
      
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">{sub.emoji} {sub.label}</h1>
          <p className="text-xs text-muted-foreground">{listings.length} stores</p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
          ))
        ) : listings.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <p className="text-4xl mb-3">{sub.emoji}</p>
            <p className="text-base font-semibold text-foreground">Coming Soon</p>
            <p className="text-sm text-muted-foreground mt-1">We're adding {sub.label} stores soon</p>
          </motion.div>
        ) : (
          listings.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <PremiumMerchantCard
                to={`/s/${item.slug}`}
                image={item.banner_url || item.logo_url}
                name={item.name}
                category={item.subcategory}
                rating={item.rating}
                reviewCount={item.reviews_count}
                distance={item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : undefined}
                index={i}
                verticalType="shops"
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
