/**
 * FoodHub — Main entry for the Food universe.
 * Cuisine → Restaurant → Menu → Item
 */
import { useState } from "react";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseSearch from "@/components/universe/UniverseSearch";
import CategoryCard from "@/components/universe/CategoryCard";
import UniverseCard from "@/components/universe/UniverseCard";
import { UtensilsCrossed } from "lucide-react";

const CUISINES = [
  { label: "African", icon: "🍛", to: "/food/african" },
  { label: "Fast Food", icon: "🍔", to: "/food/fast-food" },
  { label: "Asian", icon: "🍜", to: "/food/asian" },
  { label: "Italian", icon: "🍕", to: "/food/italian" },
  { label: "Healthy", icon: "🥗", to: "/food/healthy" },
  { label: "Bakery", icon: "🥐", to: "/food/bakery" },
  { label: "Seafood", icon: "🦐", to: "/food/seafood" },
  { label: "Grill", icon: "🥩", to: "/food/grill" },
];

const MOCK_RESTAURANTS = [
  { id: "1", title: "Mama Africa Kitchen", subtitle: "African · 25 min · 1.2km", rating: 4.7, badge: "Popular", image: "" },
  { id: "2", title: "Burger Factory", subtitle: "Fast Food · 15 min · 0.8km", rating: 4.3, badge: "Promo", image: "" },
  { id: "3", title: "Sushi Wave", subtitle: "Japanese · 30 min · 2.5km", rating: 4.8, image: "" },
  { id: "4", title: "La Bella Pizza", subtitle: "Italian · 20 min · 1.5km", rating: 4.5, image: "" },
];

export default function FoodHub() {
  const [search, setSearch] = useState("");

  return (
    <UniversePageShell
      title="Food"
      subtitle="Order from nearby restaurants"
      icon={<UtensilsCrossed className="h-6 w-6 text-primary-foreground" />}
      search={<UniverseSearch placeholder="Search restaurants, cuisines…" value={search} onChange={setSearch} />}
    >
      {/* Cuisine grid */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {CUISINES.map((c, i) => (
          <CategoryCard key={c.label} to={c.to} icon={c.icon} label={c.label} index={i} />
        ))}
      </div>

      {/* Nearby restaurants */}
      <h2 className="text-sm font-bold text-foreground mb-3">Nearby</h2>
      <div className="space-y-3">
        {MOCK_RESTAURANTS.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase())).map((r, i) => (
          <UniverseCard
            key={r.id}
            to={`/food/restaurant/${r.id}`}
            title={r.title}
            subtitle={r.subtitle}
            rating={r.rating}
            badge={r.badge}
            image={r.image || undefined}
            index={i}
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
