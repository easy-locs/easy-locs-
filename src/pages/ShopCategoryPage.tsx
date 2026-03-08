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
      let query = supabase
        .from("concierge_services" as any)
        .select("*")
        .eq("active", true)
        .order("sort_order");

      if (category) query = query.ilike("category", `%${category}%`);
      if (city) query = query.ilike("city", `%${city}%`);

      const { data } = await query.limit(50);
      return (data || []) as any[];
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
        <div className="bg-gradient-to-br from-accent/10 to-background border-b border-border">
          <div className="max-w-5xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground mt-1">{services.length} services available</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          {services.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No services found in this category</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((s: any) => {
                const photo = s.photo_url || (Array.isArray(s.photo_urls) && s.photo_urls[0]);
                return (
                  <Card key={s.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {photo && (
                      <div className="aspect-video bg-muted">
                        <img src={photo} alt={s.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold text-foreground truncate">{s.title}</h3>
                      {s.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {s.city}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">{s.category}</Badge>
                        <span className="font-bold text-accent">{fmtPrice(s.price, s.currency)}</span>
                      </div>
                      {s.booking_slug && (
                        <Button size="sm" className="w-full mt-2" asChild>
                          <Link to={`/book/${s.booking_slug}`}><ExternalLink className="h-3 w-3 mr-1" /> Book</Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
