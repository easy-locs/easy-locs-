/**
 * GroceryHub — Grocery category page connected to seed data.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseSearch from "@/components/universe/UniverseSearch";
import FilterChip from "@/components/universe/FilterChip";
import MerchantCard from "@/components/marketplace/MerchantCard";
import { ShoppingCart } from "lucide-react";

const FAMILIES = [
  { label: "Fruits & Veg", icon: "🥬" },
  { label: "Meat & Fish", icon: "🥩" },
  { label: "Dairy", icon: "🧀" },
  { label: "Bakery", icon: "🍞" },
  { label: "Drinks", icon: "🥤" },
  { label: "Snacks", icon: "🍿" },
  { label: "Household", icon: "🧴" },
  { label: "Baby", icon: "🍼" },
];

const FILTERS = ["All", "Open now", "Free delivery", "Organic", "Express"];

export default function GroceryHub() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["grocery-hub-seed"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_listings")
        .select("*")
        .eq("category", "grocery")
        .eq("is_open", true)
        .order("is_featured", { ascending: false })
        .order("visibility_score", { ascending: false })
        .limit(20);
      return (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        category: `${r.subcategory.replace("_", " ")} · ${r.area}`,
        rating: Number(r.rating),
        image: r.cover_image,
        eta: `${r.delivery_time_min}–${r.delivery_time_max} min`,
        badge: r.is_featured ? "Featured" : undefined,
      }));
    },
    staleTime: 60_000,
  });

  const filtered = stores.filter((s: any) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <UniversePageShell
      title="Grocery"
      subtitle="Fresh groceries delivered fast"
      icon={<ShoppingCart className="h-5 w-5 text-primary-foreground" />}
      gradient="linear-gradient(135deg, hsl(142 60% 38%), hsl(142 50% 50%))"
      seoTitle="Grocery Delivery — Fresh Food & Essentials | Easy-Locs"
      seoDescription="Get fresh groceries, organic produce, and household essentials delivered to your door."
      search={<UniverseSearch placeholder="Search products, stores…" value={search} onChange={setSearch} />}
      filters={FILTERS.map(f => (
        <FilterChip key={f} label={f} active={activeFilter === f} onClick={() => setActiveFilter(f)} />
      ))}
      isEmpty={filtered.length === 0 && !isLoading}
      emptyMessage="No stores found"
    >
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Categories</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {FAMILIES.map((f) => (
          <button key={f.label} className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
              <span className="text-2xl">{f.icon}</span>
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight text-center">{f.label}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Stores near you</h2>
          <div className="space-y-2">
            {filtered.map((s: any, i: number) => (
              <MerchantCard
                key={s.id}
                to={`/grocery/store/${s.id}`}
                name={s.name}
                category={s.category}
                rating={s.rating}
                image={s.image}
                badge={s.badge}
                eta={s.eta}
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
