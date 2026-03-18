/**
 * ServicesHub — Main entry for the Services universe.
 * Group (Home/Personal/Professional) → Service Type → Provider
 */
import { useState } from "react";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseSearch from "@/components/universe/UniverseSearch";
import CategoryCard from "@/components/universe/CategoryCard";
import UniverseCard from "@/components/universe/UniverseCard";
import FilterChip from "@/components/universe/FilterChip";
import { Wrench } from "lucide-react";

const SERVICE_GROUPS = [
  { label: "Cleaning", icon: "🧹", to: "/services/cleaning" },
  { label: "Plumbing", icon: "🔧", to: "/services/plumbing" },
  { label: "Electric", icon: "⚡", to: "/services/electric" },
  { label: "Beauty", icon: "💇", to: "/services/beauty" },
  { label: "Moving", icon: "📦", to: "/services/moving" },
  { label: "Repair", icon: "🔨", to: "/services/repair" },
  { label: "Tutoring", icon: "📚", to: "/services/tutoring" },
  { label: "Health", icon: "🩺", to: "/services/health" },
];

const FILTERS = ["All", "Available now", "Top rated", "Verified", "Promos"];

const MOCK_PROVIDERS = [
  { id: "1", title: "CleanPro Services", subtitle: "Home cleaning specialist", rating: 4.9, badge: "Top rated", price: "From 25€", distance: "1.2km" },
  { id: "2", title: "Fast Fix Plumbing", subtitle: "Emergency plumbing 24/7", rating: 4.5, price: "From 40€", distance: "2km", eta: "Available now" },
  { id: "3", title: "Glow Beauty Studio", subtitle: "Hair, nails & skincare", rating: 4.7, badge: "Promo -20%", price: "From 15€", distance: "0.8km" },
  { id: "4", title: "MoveEasy", subtitle: "Moving & logistics", rating: 4.4, price: "From 80€", distance: "3km" },
];

export default function ServicesHub() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const filtered = MOCK_PROVIDERS.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <UniversePageShell
      title="Services"
      subtitle="Book local professionals"
      icon={<Wrench className="h-5 w-5 text-primary-foreground" />}
      gradient="linear-gradient(135deg, hsl(220 70% 45%), hsl(220 60% 60%))"
      seoTitle="Local Services — Book Professionals Near You | Easy-Locs"
      seoDescription="Find and book trusted local professionals for cleaning, plumbing, beauty, moving and more. Verified providers with real reviews."
      search={<UniverseSearch placeholder="Search services, providers…" value={search} onChange={setSearch} />}
      filters={FILTERS.map(f => (
        <FilterChip key={f} label={f} active={activeFilter === f} onClick={() => setActiveFilter(f)} />
      ))}
      isEmpty={filtered.length === 0}
      emptyMessage="No providers found"
    >
      {/* Service categories */}
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Categories</h2>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {SERVICE_GROUPS.map((g, i) => (
          <CategoryCard key={g.label} to={g.to} icon={g.icon} label={g.label} index={i} />
        ))}
      </div>

      {/* Provider list */}
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Top providers</h2>
      <div className="space-y-2">
        {filtered.map((p, i) => (
          <UniverseCard
            key={p.id}
            to={`/services/provider/${p.id}`}
            title={p.title}
            subtitle={p.subtitle}
            rating={p.rating}
            badge={p.badge}
            price={p.price}
            distance={p.distance}
            eta={p.eta}
            index={i}
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
