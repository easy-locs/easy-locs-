/**
 * FoodHub — Careem-style food entry: Delivery / Pickup → Cuisine → Restaurant
 * Real DB data for nearby restaurants.
 */
import { useState } from "react";
import { useDinoPageAudit } from "@/hooks/useDinoPageAudit";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseSearch from "@/components/universe/UniverseSearch";
import CategoryCard from "@/components/universe/CategoryCard";
import UniverseCard from "@/components/universe/UniverseCard";
import FilterChip from "@/components/universe/FilterChip";
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
        .select("id, name, slug, city, vertical, subcategory, description, rating")
        .eq("active", true)
        .limit(20);
      return (data || []).map((r: any) => ({
        id: r.id,
        title: r.name || "Restaurant",
        subtitle: r.subcategory || r.city || "",
        rating: r.rating ?? 4.2,
        slug: r.slug,
      }));
    },
    staleTime: 120_000,
    placeholderData: (prev: any) => prev,
  });

  const filtered = restaurants.filter((r: any) =>
    !search || r.title.toLowerCase().includes(search.toLowerCase())
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
      {/* Mode selection — Careem style */}
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
          style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border) / 0.3)" }}
        >
          <span className="text-2xl">🏪</span>
          <span className="text-sm font-bold">Pickup</span>
        </button>
      </div>

      {/* Cuisine grid */}
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Cuisines</h2>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {CUISINES.map((c, i) => (
          <CategoryCard key={c.slug} to={`/food/delivery/${c.slug}`} icon={c.icon} label={c.label} index={i} />
        ))}
      </div>

      {/* Restaurant list — real data */}
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Nearby restaurants</h2>
      <div className="space-y-2">
        {filtered.map((r: any, i: number) => (
          <UniverseCard
            key={r.id}
            to={`/food/restaurant/${r.slug || r.id}`}
            title={r.title}
            subtitle={r.subtitle}
            rating={r.rating}
            index={i}
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
