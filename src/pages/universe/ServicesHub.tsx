/**
 * ServicesHub — Main entry for the Services universe.
 * Group (Home/Personal/Professional) → Service Type → Provider
 */
import { useState } from "react";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseSearch from "@/components/universe/UniverseSearch";
import CategoryCard from "@/components/universe/CategoryCard";
import UniverseCard from "@/components/universe/UniverseCard";
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

const MOCK_PROVIDERS = [
  { id: "1", title: "CleanPro Services", subtitle: "Cleaning · ★ 4.9 · 12 reviews", rating: 4.9, badge: "Top rated", price: "From 25€", image: "" },
  { id: "2", title: "Fast Fix Plumbing", subtitle: "Plumbing · Available now · 2km", rating: 4.5, image: "", price: "From 40€" },
  { id: "3", title: "Glow Beauty Studio", subtitle: "Beauty · 0.8km", rating: 4.7, badge: "Promo -20%", price: "From 15€", image: "" },
];

export default function ServicesHub() {
  const [search, setSearch] = useState("");

  return (
    <UniversePageShell
      title="Services"
      subtitle="Book local professionals"
      icon={<Wrench className="h-6 w-6 text-primary-foreground" />}
      gradient="linear-gradient(135deg, hsl(220 70% 50%), hsl(220 70% 65%))"
      search={<UniverseSearch placeholder="Search services, providers…" value={search} onChange={setSearch} />}
    >
      {/* Service categories */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {SERVICE_GROUPS.map((g, i) => (
          <CategoryCard key={g.label} to={g.to} icon={g.icon} label={g.label} index={i} />
        ))}
      </div>

      {/* Top providers */}
      <h2 className="text-sm font-bold text-foreground mb-3">Top providers</h2>
      <div className="space-y-3">
        {MOCK_PROVIDERS.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase())).map((p, i) => (
          <UniverseCard
            key={p.id}
            to={`/services/provider/${p.id}`}
            title={p.title}
            subtitle={p.subtitle}
            rating={p.rating}
            badge={p.badge}
            price={p.price}
            image={p.image || undefined}
            index={i}
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
