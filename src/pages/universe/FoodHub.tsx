/**
 * FoodHub — Careem-style food entry with categories, filters, and real merchant data.
 * Route: /food
 */
import { useState } from "react";
import { useDinoPageAudit } from "@/hooks/useDinoPageAudit";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseSearch from "@/components/universe/UniverseSearch";
import FilterChip from "@/components/universe/FilterChip";
import MerchantCard from "@/components/marketplace/MerchantCard";
import { UtensilsCrossed } from "lucide-react";

const CUISINES = [
  { label: "African", icon: "🍛", slug: "african" },
  { label: "Fast Food", icon: "🍔", slug: "fast-food" },
  { label: "Asian", icon: "🍜", slug: "asian" },
  { label: "Italian", icon: "🍕", slug: "italian" },
  { label: "Healthy", icon: "🥗", slug: "healthy" },
  { label: "Bakery", icon: "🥐", slug: "bakery" },
  { label: "Seafood", icon: "🦐", slug: "seafood" },
  { label: "Grill", icon: "🥩", slug: "grill" },
];

const FILTERS = ["All", "Open now", "Free delivery", "Top rated", "Promos"];

export default function FoodHub() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const navigate = useNavigate();
  useDinoPageAudit({ actorType: "anonymous", pageKey: "food_home" });

  const { data: restaurants = [] } = useQuery({
    queryKey: ["food-hub-restaurants"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, city, vertical, subcategory, description, rating, logo_url, cover_url")
        .eq("active", true)
        .limit(20);
      return (data || []).map((r: any) => ({
        id: r.id,
        name: r.name || "Restaurant",
        category: r.subcategory || r.city || "",
        rating: r.rating ?? 4.2,
        slug: r.slug,
        image: r.cover_url || r.logo_url,
      }));
    },
    staleTime: 120_000,
    placeholderData: (prev: any) => prev,
  });

  const filtered = restaurants.filter((r: any) =>
    !search || r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <UniversePageShell
      title="Food"
      subtitle="Order from nearby restaurants"
      icon={<UtensilsCrossed className="h-5 w-5 text-primary-foreground" />}
      seoTitle="Food Delivery — Order from Local Restaurants | Easy-Locs"
      seoDescription="Browse nearby restaurants, order your favourite cuisine and get fast delivery."
      search={<UniverseSearch placeholder="Search restaurants, cuisines…" value={search} onChange={setSearch} />}
      filters={FILTERS.map(f => (
        <FilterChip key={f} label={f} active={activeFilter === f} onClick={() => setActiveFilter(f)} />
      ))}
      isEmpty={filtered.length === 0}
      emptyMessage="No restaurants found"
    >
      {/* Mode selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => navigate("/food/delivery")}
          className="rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.2)" }}
        >
          <span className="text-2xl">🛵</span>
          <span className="text-sm font-bold" style={{ color: "hsl(var(--primary))" }}>Delivery</span>
        </button>
        <button
          onClick={() => navigate("/food/pickup")}
          className="rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border) / 0.2)" }}
        >
          <span className="text-2xl">🏪</span>
          <span className="text-sm font-bold text-foreground">Pickup</span>
        </button>
      </div>

      {/* Cuisine grid */}
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Cuisines</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {CUISINES.map((c) => (
          <button
            key={c.slug}
            onClick={() => navigate(`/food/delivery/${c.slug}`)}
            className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
              <span className="text-2xl">{c.icon}</span>
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight">{c.label}</span>
          </button>
        ))}
      </div>

      {/* Restaurant list */}
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Nearby restaurants</h2>
      <div className="space-y-2">
        {filtered.map((r: any, i: number) => (
          <MerchantCard
            key={r.id}
            to={`/food/restaurant/${r.slug || r.id}`}
            image={r.image}
            name={r.name}
            category={r.category}
            rating={r.rating}
            eta="15–30 min"
            index={i}
            variant="horizontal"
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
