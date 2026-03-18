/**
 * GroceryHub — Main entry for the Grocery universe.
 * Product Family → Category → Sub-category → Product Grid
 */
import { useState } from "react";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseSearch from "@/components/universe/UniverseSearch";
import CategoryCard from "@/components/universe/CategoryCard";
import UniverseCard from "@/components/universe/UniverseCard";
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

const MOCK_STORES = [
  { id: "1", title: "FreshMart Express", subtitle: "Supermarket · 10 min · 0.5km", rating: 4.6, badge: "Free delivery", image: "" },
  { id: "2", title: "Africa Grocers", subtitle: "Local market · 15 min · 1km", rating: 4.4, image: "" },
  { id: "3", title: "Bio & Natural", subtitle: "Organic · 20 min · 2km", rating: 4.8, badge: "New", image: "" },
];

export default function GroceryHub() {
  const [search, setSearch] = useState("");

  return (
    <UniversePageShell
      title="Grocery"
      subtitle="Fresh groceries delivered fast"
      icon={<ShoppingCart className="h-6 w-6 text-primary-foreground" />}
      gradient="linear-gradient(135deg, hsl(142 60% 40%), hsl(142 60% 55%))"
      search={<UniverseSearch placeholder="Search products, stores…" value={search} onChange={setSearch} />}
    >
      {/* Product families */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {FAMILIES.map((f, i) => (
          <CategoryCard key={f.label} to={f.to} icon={f.icon} label={f.label} index={i} />
        ))}
      </div>

      {/* Nearby stores */}
      <h2 className="text-sm font-bold text-foreground mb-3">Stores near you</h2>
      <div className="space-y-3">
        {MOCK_STORES.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase())).map((s, i) => (
          <UniverseCard
            key={s.id}
            to={`/grocery/store/${s.id}`}
            title={s.title}
            subtitle={s.subtitle}
            rating={s.rating}
            badge={s.badge}
            image={s.image || undefined}
            index={i}
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
