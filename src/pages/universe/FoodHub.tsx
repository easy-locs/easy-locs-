/**
 * FoodHub — Food category page connected to seed data.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseSearch from "@/components/universe/UniverseSearch";
import FilterChip from "@/components/universe/FilterChip";
import MerchantCard from "@/components/marketplace/MerchantCard";
import { UtensilsCrossed } from "lucide-react";

const CUISINES = [
  { label: "Pizza", icon: "🍕", slug: "pizza" },
  { label: "Burger", icon: "🍔", slug: "burger" },
  { label: "Shawarma", icon: "🥙", slug: "shawarma" },
  { label: "Indian", icon: "🍛", slug: "indian" },
  { label: "Chinese", icon: "🥡", slug: "chinese" },
  { label: "Healthy", icon: "🥗", slug: "healthy" },
  { label: "Pasta", icon: "🍝", slug: "pasta" },
  { label: "Desserts", icon: "🍰", slug: "desserts" },
];

const FILTERS = ["All", "Open now", "Featured", "Top rated"];

export default function FoodHub() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["food-hub-seed", activeCuisine],
    queryFn: async () => {
      let query = (supabase as any)
        .from("marketplace_listings")
        .select("*")
        .eq("category", "food")
        .eq("is_open", true)
        .order("is_featured", { ascending: false })
        .order("visibility_score", { ascending: false })
        .limit(50);

      if (activeCuisine) {
        query = query.eq("subcategory", activeCuisine);
      }

      const { data } = await query;
      return (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        category: `${r.subcategory} · ${r.area}`,
        rating: Number(r.rating),
        image: r.cover_image,
        eta: `${r.delivery_time_min}–${r.delivery_time_max} min`,
        badge: r.is_featured ? "Featured" : undefined,
      }));
    },
    staleTime: 60_000,
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
      isEmpty={filtered.length === 0 && !isLoading}
      emptyMessage="No restaurants found"
    >
      {/* Cuisine grid */}
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Cuisines</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {CUISINES.map((c) => (
          <button
            key={c.slug}
            onClick={() => setActiveCuisine(activeCuisine === c.slug ? null : c.slug)}
            className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
              style={{
                background: activeCuisine === c.slug ? "hsl(var(--primary) / 0.15)" : "hsl(var(--muted))",
                border: activeCuisine === c.slug ? "2px solid hsl(var(--primary))" : "2px solid transparent",
              }}
            >
              <span className="text-2xl">{c.icon}</span>
            </div>
            <span className={`text-[11px] font-semibold leading-tight ${activeCuisine === c.slug ? "text-primary" : "text-foreground"}`}>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />
          ))}
        </div>
      )}

      {/* Restaurant list */}
      {!isLoading && filtered.length > 0 && (
        <>
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            {activeCuisine ? `${activeCuisine.charAt(0).toUpperCase() + activeCuisine.slice(1)} restaurants` : "Nearby restaurants"}
          </h2>
          <div className="space-y-2">
            {filtered.map((r: any, i: number) => (
              <MerchantCard
                key={r.id}
                to={`/food/restaurant/${r.id}`}
                image={r.image}
                name={r.name}
                category={r.category}
                rating={r.rating}
                eta={r.eta}
                badge={r.badge}
                index={i}
                variant="horizontal"
              />
            ))}
          </div>
        </>
      )}
    </UniversePageShell>
  );
}
