/**
 * GroceryHub — Grocery universe entry.
 */
import { useState } from "react";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseSearch from "@/components/universe/UniverseSearch";
import FilterChip from "@/components/universe/FilterChip";
import MerchantCard from "@/components/marketplace/MerchantCard";
import { ShoppingCart } from "lucide-react";

const FAMILIES = [
  { label: "Fruits & Veg", icon: "🥬", to: "/grocery/fruits-vegetables" },
  { label: "Meat & Fish", icon: "🥩", to: "/grocery/meat-fish" },
  { label: "Dairy", icon: "🧀", to: "/grocery/dairy" },
  { label: "Bakery", icon: "🍞", to: "/grocery/bakery" },
  { label: "Drinks", icon: "🥤", to: "/grocery/drinks" },
  { label: "Snacks", icon: "🍿", to: "/grocery/snacks" },
  { label: "Household", icon: "🧴", to: "/grocery/household" },
  { label: "Baby", icon: "🍼", to: "/grocery/baby" },
];

const FILTERS = ["All", "Open now", "Free delivery", "Organic", "Express"];

const MOCK_STORES = [
  { id: "1", name: "FreshMart Express", category: "Supermarket · Full range", rating: 4.6, badge: "Free delivery", eta: "10 min", distance: "0.5km" },
  { id: "2", name: "Africa Grocers", category: "Local market · Fresh produce", rating: 4.4, eta: "15 min", distance: "1km" },
  { id: "3", name: "Bio & Natural", category: "Organic store", rating: 4.8, badge: "New", eta: "20 min", distance: "2km" },
  { id: "4", name: "QuickShop 24h", category: "Convenience · Open 24/7", rating: 4.2, eta: "8 min", distance: "0.3km" },
];

export default function GroceryHub() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const filtered = MOCK_STORES.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

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
      isEmpty={filtered.length === 0}
      emptyMessage="No stores found"
    >
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Categories</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {FAMILIES.map((f) => (
          <button key={f.label} onClick={() => {}} className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
              <span className="text-2xl">{f.icon}</span>
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight text-center">{f.label}</span>
          </button>
        ))}
      </div>

      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Stores near you</h2>
      <div className="space-y-2">
        {filtered.map((s, i) => (
          <MerchantCard
            key={s.id}
            to={`/grocery/store/${s.id}`}
            name={s.name}
            category={s.category}
            rating={s.rating}
            badge={s.badge}
            eta={s.eta}
            distance={s.distance}
            index={i}
            variant="horizontal"
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
