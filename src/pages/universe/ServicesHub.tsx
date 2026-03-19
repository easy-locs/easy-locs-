/**
 * ServicesHub — Services category page connected to seed data.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

export default function ServicesHub() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["services-hub-seed"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marketplace_listings")
        .select("*")
        .eq("category", "services")
        .eq("is_open", true)
        .order("is_featured", { ascending: false })
        .order("visibility_score", { ascending: false })
        .limit(20);
      return (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        category: `${r.subcategory} · ${r.area}`,
        rating: Number(r.rating),
        image: r.cover_image,
        eta: `${r.delivery_time_min}–${r.delivery_time_max} min`,
        badge: r.is_featured ? "Top rated" : undefined,
      }));
    },
    staleTime: 60_000,
  });

  const filtered = providers.filter((p: any) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

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
      isEmpty={filtered.length === 0 && !isLoading}
      emptyMessage="No providers found"
    >
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Categories</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {SERVICE_GROUPS.map((g) => (
          <button key={g.label} className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
              <span className="text-2xl">{g.icon}</span>
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight text-center">{g.label}</span>
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
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Top providers</h2>
          <div className="space-y-2">
            {filtered.map((p: any, i: number) => (
              <MerchantCard
                key={p.id}
                to={`/services/provider/${p.id}`}
                name={p.name}
                category={p.category}
                rating={p.rating}
                image={p.image}
                badge={p.badge}
                eta={p.eta}
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
