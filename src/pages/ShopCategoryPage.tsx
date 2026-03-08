import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { buildAppUrl } from "@/lib/app-domain";
import { ExternalLink, Loader2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const fmtPrice = (amount: number, currency: string = "EUR") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

export default function ShopCategoryPage() {
  const { categoryCity } = useParams<{ categoryCity: string }>();

  // Parse "cars-marrakech" → category=cars, city=marrakech
  const parts = (categoryCity || "").split("-");
  const city = parts.pop() || "";
  const category = parts.join("-") || "";

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["shop-category", category, city],
    queryFn: async () => {
      // Query both concierge_services and marketplace_services
      let q1 = supabase
        .from("concierge_services")
        .select("id, title, description, category, city, country, price, currency, photo_url, booking_slug, duration_minutes")
        .eq("active", true);
      if (category) q1 = q1.ilike("category", `%${category}%`);
      if (city) q1 = q1.ilike("city", `%${city}%`);

      let q2 = supabase
        .from("marketplace_services")
        .select("id, title, description, category, city, country, price, currency, photo_urls, price_type, duration_minutes, booking_slug")
        .eq("active", true);
      if (category) q2 = q2.ilike("category", `%${category}%`);
      if (city) q2 = q2.ilike("city", `%${city}%`);

      const [r1, r2] = await Promise.all([q1.limit(50), q2.limit(50)]);

      const conciergeItems = (r1.data || []).map((s: any) => ({
        ...s,
        source: "concierge" as const,
        photo: s.photo_url,
        slug: s.booking_slug,
      }));

      const marketplaceItems = (r2.data || []).map((s: any) => ({
        ...s,
        source: "marketplace" as const,
        photo: Array.isArray(s.photo_urls) ? s.photo_urls[0] : null,
        slug: s.booking_slug,
      }));

      return [...conciergeItems, ...marketplaceItems];
    },
    enabled: !!(category || city),
  });

  const title = `${category ? category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Services"}${city ? ` in ${city.replace(/\b\w/g, c => c.toUpperCase())}` : ""}`;

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <>
      <SEOHead
        title={`${title} | Easy-Locs`}
        description={`Browse ${title.toLowerCase()} on Easy-Locs. Book trusted local services.`}
        canonical={buildAppUrl(`/shop/${categoryCity}`)}
      />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground mb-8">{services.length} services available</p>

          {services.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">No services found in this category</p>
                <Link to="/">
                  <Button variant="outline" className="mt-4">Browse all</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((s: any) => (
                <Card key={`${s.source}-${s.id}`} className="overflow-hidden hover:border-accent/50 transition-colors group">
                  {s.photo && (
                    <div className="aspect-[16/9] bg-muted overflow-hidden">
                      <img src={s.photo} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                  )}
                  <CardContent className="pt-4 space-y-2">
                    <h3 className="font-semibold text-foreground line-clamp-1">{s.title}</h3>
                    {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {s.city}, {s.country}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="font-bold text-accent">{fmtPrice(s.price, s.currency)}{s.price_type === "daily" ? "/day" : s.price_type === "hourly" ? "/h" : ""}</span>
                      {s.slug ? (
                        <Link to={`/book/${s.slug}`}>
                          <Button size="sm"><ExternalLink className="h-3 w-3 mr-1" /> Book</Button>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="text-xs">Contact</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
