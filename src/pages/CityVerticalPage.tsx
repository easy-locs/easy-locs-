import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { captureDemandEvent } from "@/lib/growth/demand-capture";
import { Badge } from "@/components/ui/badge";

export default function CityVerticalPage() {
  const { countryCode, city, vertical, locale } = useParams();
  const [page, setPage] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!countryCode || !city || !vertical || !locale) return;

    (async () => {
      const slug = `city/${countryCode.toLowerCase()}/${city}/${vertical}/${locale}`;
      const [{ data: pageData }, { data: merchants }] = await Promise.all([
        (supabase as any)
          .from("growth_city_pages")
          .select("*")
          .eq("slug", slug)
          .maybeSingle(),
        (supabase as any)
          .from("storefront_pages")
          .select("id, name, slug, city, vertical, shop_visibility")
          .eq("country", countryCode.toUpperCase())
          .ilike("city", city)
          .eq("vertical", vertical)
          .limit(50),
      ]);

      setPage(pageData);
      setItems(merchants ?? []);

      await captureDemandEvent({
        city,
        countryCode,
        vertical: vertical as any,
        eventType: "page_view",
        metadata: { slug },
      }).catch(() => {});
    })();
  }, [countryCode, city, vertical, locale]);

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">{page?.h1 ?? "City Page"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{page?.intro_text}</p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/shop/${item.slug}`}
            className="block border border-border rounded-xl p-4 hover:bg-accent/5 transition-colors"
          >
            <p className="text-sm font-semibold text-foreground">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.city}</p>
            <Badge variant={item.shop_visibility === "coming_soon" ? "secondary" : "default"} className="mt-1 text-xs">
              {item.shop_visibility === "coming_soon" ? "Coming soon" : "Live"}
            </Badge>
          </Link>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No merchants found yet.</p>
        )}
      </div>
    </div>
  );
}
