/**
 * RetailCategoryPage — Browse retail shops by category slug.
 * Route: /shop/category/:categorySlug
 */
import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import SubPageShell from "@/components/layout/SubPageShell";
import { motion } from "framer-motion";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";
import { useVerticalListings } from "@/hooks/useVerticalListings";
import PremiumMerchantCard from "@/components/discovery/PremiumMerchantCard";
import SEOHead from "@/components/SEOHead";
import { useUiEngine } from "@/hooks/useUiEngine";

const shopsCategory = CATEGORY_TREE.find(c => c.key === "shops")!;

export default function RetailCategoryPage() {
  useUiEngine("universe-retailcategorypage");
  const { categorySlug, subcategorySlug } = useParams<{ categorySlug: string; subcategorySlug?: string }>();
  const navigate = useNavigate();

  const sub = useMemo(() => {
    const rawSlug = subcategorySlug ?? categorySlug;
    const normalized = rawSlug?.replace(/-/g, "_");
    return shopsCategory.subcategories.find(
      s => s.value === normalized || s.label.toLowerCase().replace(/[\s&']/g, "-").replace(/-+/g, "-") === rawSlug
    );
  }, [categorySlug, subcategorySlug]);

  const { data: listings = [], isLoading } = useVerticalListings("shops", sub?.value ?? null);

  if (!sub) {
    return (
      <SubPageShell title="Category not found" onBack={() => navigate("/browse/shops")}>
        <p className="text-sm text-muted-foreground">This category could not be found.</p>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell
      title={`${sub.emoji} ${sub.label}`}
      subtitle={`${listings.length} stores`}
      onBack={() => navigate(-1)}
      noContentPad
    >
      <SEOHead title={`${sub.label} — Easy-Locs`} description={`Browse ${sub.label} stores and shops`} />
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
    </SubPageShell>
  );
}
