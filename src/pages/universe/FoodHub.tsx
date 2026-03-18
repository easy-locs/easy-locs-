/**
 * FoodHub — Main entry for the Food universe.
 * Cuisine → Restaurant → Menu → Item
 */
import { useState } from "react";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseSearch from "@/components/universe/UniverseSearch";
import CategoryCard from "@/components/universe/CategoryCard";
import UniverseCard from "@/components/universe/UniverseCard";
import FilterChip from "@/components/universe/FilterChip";
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

const FILTERS = ["All", "Open now", "Free delivery", "Top rated", "Promos"];

const MOCK_RESTAURANTS = [
  { id: "1", title: "Mama Africa Kitchen", subtitle: "African cuisine", rating: 4.7, badge: "Popular", eta: "25 min", distance: "1.2km" },
  { id: "2", title: "Burger Factory", subtitle: "Fast food & burgers", rating: 4.3, badge: "Promo", eta: "15 min", distance: "0.8km" },
  { id: "3", title: "Sushi Wave", subtitle: "Japanese & sushi", rating: 4.8, eta: "30 min", distance: "2.5km" },
  { id: "4", title: "La Bella Pizza", subtitle: "Italian, pizza, pasta", rating: 4.5, eta: "20 min", distance: "1.5km" },
  { id: "5", title: "Green Bowl", subtitle: "Healthy & salads", rating: 4.6, badge: "New", eta: "18 min", distance: "0.9km" },
];

export default function FoodHub() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const filtered = MOCK_RESTAURANTS.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <UniversePageShell
      title="Food"
      subtitle="Order from nearby restaurants"
      icon={<UtensilsCrossed className="h-5 w-5 text-primary-foreground" />}
      seoTitle="Food Delivery — Order from Local Restaurants | Easy-Locs"
      seoDescription="Browse nearby restaurants, order your favourite cuisine and get fast delivery. African, Asian, Italian, Fast Food and more."
      search={<UniverseSearch placeholder="Search restaurants, cuisines…" value={search} onChange={setSearch} />}
      filters={FILTERS.map(f => (
        <FilterChip key={f} label={f} active={activeFilter === f} onClick={() => setActiveFilter(f)} />
      ))}
      isEmpty={filtered.length === 0}
      emptyMessage="No restaurants found"
    >
      {/* Cuisine grid */}
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Cuisines</h2>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {CUISINES.map((c, i) => (
          <CategoryCard key={c.label} to={c.to} icon={c.icon} label={c.label} index={i} />
        ))}
      </div>

      {/* Restaurant list */}
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Nearby restaurants</h2>
      <div className="space-y-2">
        {filtered.map((r, i) => (
          <UniverseCard
            key={r.id}
            to={`/food/restaurant/${r.id}`}
            title={r.title}
            subtitle={r.subtitle}
            rating={r.rating}
            badge={r.badge}
            eta={r.eta}
            distance={r.distance}
            index={i}
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
