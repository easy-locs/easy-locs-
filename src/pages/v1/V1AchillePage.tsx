import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { V1PrimaryAppBridge } from "@/components/v1/V1PrimaryAppBridge";
import { Star, MapPin, Clock } from "lucide-react";

/**
 * Fetch merchants from both marketplace_listings AND storefront_pages,
 * deduplicate by name+city, and return a unified list.
 */
async function fetchAllMerchants(limit: number) {
  // Fetch from marketplace_listings
  const { data: mlData } = await (supabase as any)
    .from("marketplace_listings")
    .select("id, name, cover_image, category, subcategory, area, city, rating, delivery_time_min, delivery_time_max, is_open")
    .eq("category", "food")
    .eq("is_open", true)
    .order("visibility_score", { ascending: false })
    .limit(limit);

  // Fetch from storefront_pages (active food businesses)
  const { data: sfData } = await (supabase as any)
    .from("storefront_pages")
    .select("id, name, slug, cover_url, logo_url, vertical, subcategory, city, rating, active")
    .eq("active", true)
    .limit(limit);

  const mlRows = (mlData || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    cover_image: r.cover_image,
    category: r.category,
    subcategory: r.subcategory,
    city: r.city || r.area,
    area: r.area,
    rating: r.rating,
    delivery_time_min: r.delivery_time_min,
    delivery_time_max: r.delivery_time_max,
    source: "marketplace" as const,
  }));

  const sfRows = (sfData || [])
    .filter((r: any) => {
      const v = (r.vertical || "").toLowerCase();
      return v.includes("food") || v.includes("restaurant") || v.includes("pizza") || v.includes("cafe");
    })
    .map((r: any) => ({
      id: r.id,
      name: r.name,
      cover_image: r.cover_url || r.logo_url,
      category: "food",
      subcategory: r.subcategory || r.vertical,
      city: r.city,
      area: r.city,
      rating: r.rating,
      delivery_time_min: 20,
      delivery_time_max: 35,
      source: "storefront" as const,
    }));

  // Deduplicate by normalized name + city
  const seen = new Set<string>();
  const merged: typeof mlRows = [];
  for (const row of [...mlRows, ...sfRows]) {
    const key = `${(row.name || "").toLowerCase().trim()}__${(row.city || "").toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }

  return merged;
}

function AchilleBody() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["v1-achille-all-merchants"],
    queryFn: () => fetchAllMerchants(60),
    staleTime: 30_000,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-28 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} restaurants near you</p>
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-muted/40 h-[180px] animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-2xl border border-border/20 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No merchants found</p>
        </div>
      )}

      {!isLoading &&
        rows.map((row: any) => (
          <button
            key={row.id}
            onClick={() => navigate(`/food/restaurant/${row.id}`)}
            className="w-full rounded-2xl border border-border/10 bg-card overflow-hidden text-left active:scale-[0.98] transition-transform shadow-sm"
          >
            {row.cover_image ? (
              <img src={row.cover_image} alt={row.name} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-muted/30 flex items-center justify-center">
                <span className="text-3xl">🍽️</span>
              </div>
            )}
            <div className="p-4 space-y-2">
              <h3 className="text-base font-bold leading-snug">{row.name}</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {row.area || row.city || "Dubai"}
                </span>
                <span className="text-border/40">·</span>
                <span>{row.subcategory || row.category}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  {Number(row.rating ?? 4.2).toFixed(1)}
                </span>
                <span className="text-border/40">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {row.delivery_time_min ?? 20}–{row.delivery_time_max ?? 35} min
                </span>
              </div>
            </div>
          </button>
        ))}
    </div>
  );
}

export default function V1AchillePage() {
  return (
    <V1PrimaryAppBridge module="achille">
      {() => <AchilleBody />}
    </V1PrimaryAppBridge>
  );
}
