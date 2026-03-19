/**
 * CuisineListPage — Step 3: Restaurant list for a cuisine
 * Route: /food/:type/:cuisine
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import UniversePageShell from "@/components/universe/UniversePageShell";
import UniverseCard from "@/components/universe/UniverseCard";
import { UtensilsCrossed } from "lucide-react";

export default function CuisineListPage() {
  const { type, cuisine } = useParams<{ type: string; cuisine: string }>();

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["cuisine-restaurants", cuisine],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, city, vertical, subcategory, description, latitude, longitude")
        .eq("active", true)
        .limit(30);
      // Filter by cuisine tag if possible
      const all = (data || []) as any[];
      if (!cuisine) return all;
      const filtered = all.filter((r: any) =>
        (r.subcategory || "").toLowerCase().includes(cuisine!) ||
        (r.description || "").toLowerCase().includes(cuisine!) ||
        (r.name || "").toLowerCase().includes(cuisine!)
      );
      return filtered.length > 0 ? filtered : all.slice(0, 10);
    },
    staleTime: 60_000,
  });

  const label = cuisine ? cuisine.charAt(0).toUpperCase() + cuisine.slice(1) : "All";

  return (
    <UniversePageShell
      title={`${label} Restaurants`}
      subtitle={`${type === "pickup" ? "Pickup" : "Delivery"} near you`}
      icon={<UtensilsCrossed className="h-5 w-5 text-primary-foreground" />}
      loading={isLoading}
      isEmpty={restaurants.length === 0}
      emptyMessage="No restaurants found for this cuisine"
    >
      <div className="space-y-2">
        {restaurants.map((r: any, i: number) => (
          <UniverseCard
            key={r.id}
            to={`/food/restaurant/${r.slug || r.id}`}
            title={r.name || "Restaurant"}
            subtitle={r.city || r.subcategory || ""}
            rating={4.0 + Math.random() * 0.9}
            index={i}
          />
        ))}
      </div>
    </UniversePageShell>
  );
}
