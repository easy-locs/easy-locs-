import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, MapPin, Store } from "lucide-react";
import SubPageShell from "@/components/layout/SubPageShell";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import { useVerticalListings } from "@/hooks/useVerticalListings";
import PremiumMerchantCard from "@/components/discovery/PremiumMerchantCard";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function RetailStorePage() {
  useUiEngine("universe-retailstorepage");
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: listings = [], isLoading } = useVerticalListings("shops", null);

  const store = useMemo(() => listings.find((item) => item.slug === slug), [listings, slug]);
  const related = useMemo(() => listings.filter((item) => item.slug !== slug).slice(0, 4), [listings, slug]);

  if (!isLoading && !store) {
    return (
      <SubPageShell title="Store not found" onBack={() => navigate("/shop")}>
        <p className="text-sm text-muted-foreground">This store could not be found.</p>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell
      title={store?.name ?? "Store"}
      subtitle={store?.subcategory?.replace(/_/g, " ") ?? "Retail"}
      onBack={() => navigate(-1)}
      noContentPad
    >
      <SEOHead title={`${store?.name ?? "Store"} — Easy-Locs`} description={`Discover ${store?.name ?? "retail store"}`} />

      {isLoading ? (
        <div className="px-4 py-4 space-y-3">
          <div className="h-48 rounded-3xl bg-muted/30 animate-pulse" />
          <div className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
        </div>
      ) : store ? (
        <>
          <div className="relative h-52 overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
            {store.banner_url || store.logo_url ? (
              <img src={store.banner_url || store.logo_url || ""} alt={store.name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-6xl">🛍️</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur-sm">
                <Store className="h-3.5 w-3.5" /> Retail Store
              </div>
            </div>
          </div>

          <div className="px-4 py-5 space-y-5">
            <section className="rounded-3xl border border-border/50 bg-card p-4 space-y-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">{store.name}</h2>
                <p className="text-sm text-muted-foreground mt-1 capitalize">{store.subcategory?.replace(/_/g, " ")}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{store.address || "Dubai Mall District"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link to={`/s/${store.slug}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">
                  Open Store <ChevronRight className="h-4 w-4" />
                </Link>
                <Link to={`/shop/category/${(store.subcategory || "fashion").replace(/_/g, "-")}`} className="inline-flex items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground">
                  Similar Stores
                </Link>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Related Stores</h3>
                <Link to="/shop" className="text-xs font-medium text-primary">See all</Link>
              </div>
              <div className="space-y-3">
                {related.map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <PremiumMerchantCard
                      to={`/shop/store/${item.slug}`}
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
                ))}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </SubPageShell>
  );
}
