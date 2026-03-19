/**
 * ServicesHub — Services universe entry.
 */
import { useState } from "react";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseSearch from "@/components/universe/UniverseSearch";
import FilterChip from "@/components/universe/FilterChip";
import MerchantCard from "@/components/marketplace/MerchantCard";
import { Wrench } from "lucide-react";

const SERVICE_GROUPS = [
  { label: "Cleaning", icon: "🧹" },
  { label: "Plumbing", icon: "🔧" },
  { label: "Electric", icon: "⚡" },
  { label: "Beauty", icon: "💇" },
  { label: "Moving", icon: "📦" },
  { label: "Repair", icon: "🔨" },
  { label: "Tutoring", icon: "📚" },
  { label: "Health", icon: "🩺" },
];

const FILTERS = ["All", "Available now", "Top rated", "Verified", "Promos"];

const MOCK_PROVIDERS = [
  { id: "1", name: "CleanPro Services", category: "Home cleaning specialist", rating: 4.9, badge: "Top rated", distance: "1.2km" },
  { id: "2", name: "Fast Fix Plumbing", category: "Emergency plumbing 24/7", rating: 4.5, distance: "2km", eta: "Available now" },
  { id: "3", name: "Glow Beauty Studio", category: "Hair, nails & skincare", rating: 4.7, badge: "Promo -20%", distance: "0.8km" },
  { id: "4", name: "MoveEasy", category: "Moving & logistics", rating: 4.4, distance: "3km" },
];

export default function ServicesHub() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const filtered = MOCK_PROVIDERS.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <UniversePageShell
      title="Services"
      subtitle="Book local professionals"
      icon={<Wrench className="h-5 w-5 text-primary-foreground" />}
      gradient="linear-gradient(135deg, hsl(220 70% 45%), hsl(220 60% 60%))"
      seoTitle="Local Services — Book Professionals Near You | Easy-Locs"
      seoDescription="Find and book trusted local professionals for cleaning, plumbing, beauty, moving and more."
      search={<UniverseSearch placeholder="Search services, providers…" value={search} onChange={setSearch} />}
      filters={FILTERS.map(f => (
        <FilterChip key={f} label={f} active={activeFilter === f} onClick={() => setActiveFilter(f)} />
      ))}
      isEmpty={filtered.length === 0}
      emptyMessage="No providers found"
    >
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Categories</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {SERVICE_GROUPS.map((g) => (
          <button key={g.label} onClick={() => {}} className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
              <span className="text-2xl">{g.icon}</span>
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight text-center">{g.label}</span>
          </button>
        ))}
      </div>

      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Top providers</h2>
      <div className="space-y-2">
        {filtered.map((p, i) => (
          <MerchantCard
            key={p.id}
            to={`/services/provider/${p.id}`}
            name={p.name}
            category={p.category}
            rating={p.rating}
            badge={p.badge}
            distance={p.distance}
            eta={p.eta}
            index={i}
            variant="horizontal"
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
