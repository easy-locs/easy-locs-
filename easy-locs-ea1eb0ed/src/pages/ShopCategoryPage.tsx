import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { buildAppUrl } from "@/lib/app-domain";
import { ExternalLink, Loader2, MapPin, ArrowRight, Search, Compass } from "lucide-react";
import { SEO_SERVICE_CATEGORIES, getPhase1Cities } from "@/lib/seo/seo-data";

const fmtPrice = (amount: number, currency: string = "EUR") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

export default function ShopCategoryPage() {
  const { categoryCity } = useParams<{ categoryCity: string }>();

  const parts = (categoryCity || "").split("-");
  const city = parts.pop() || "";
  const category = parts.join("-") || "";

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["shop-category", category, city],
    queryFn: async () => {
      let q1 = supabase
        .from("concierge_services_public" as any)
        .select("id, title, description, category, city, country, price, currency, photo_url, booking_slug, duration_minutes");
      if (category) q1 = q1.ilike("category", `%${category}%`);
      if (city) q1 = q1.ilike("city", `%${city}%`);

      let q2 = supabase
        .from("marketplace_services_public" as any)
        .select("id, title, description, category, city, country, price, currency, photo_urls, price_type, duration_minutes, booking_slug");
      if (category) q2 = q2.ilike("category", `%${category}%`);
      if (city) q2 = q2.ilike("city", `%${city}%`);

      const [r1, r2] = await Promise.all([q1.limit(50), q2.limit(50)]);

      const conciergeItems = (r1.data || []).map((s: any) => ({
        ...s, source: "concierge" as const, photo: s.photo_url, slug: s.booking_slug,
      }));
      const marketplaceItems = (r2.data || []).map((s: any) => ({
        ...s, source: "marketplace" as const, photo: Array.isArray(s.photo_urls) ? s.photo_urls[0] : null, slug: s.booking_slug,
      }));

      return [...conciergeItems, ...marketplaceItems];
    },
    enabled: !!(category || city),
  });

  const prettyCategory = category ? category.replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Services";
  const prettyCity = city ? city.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";
  const title = `${prettyCategory}${prettyCity ? ` in ${prettyCity}` : ""}`;

  const matchedSeoCategory = SEO_SERVICE_CATEGORIES.find(s => s.slug === category);
  const suggestedCities = getPhase1Cities().slice(0, 8);
  const otherCategories = SEO_SERVICE_CATEGORIES.filter(s => s.slug !== category).slice(0, 6);

  if (isLoading) return (
    <div className="app-mobile-page bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="app-mobile-page bg-background">
      <SEOHead
        title={`${title} | Easy-Locs`}
        description={`Browse ${title.toLowerCase()} on Easy-Locs. Book trusted local services.`}
        canonical={buildAppUrl(`/shop/${categoryCity}`)}
      />
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link to="/marketplace" className="hover:text-foreground">Marketplace</Link>
          <span>/</span>
          {category && (
            <>
              <Link to={`/services/${category}`} className="hover:text-foreground">{prettyCategory}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground font-medium">{prettyCity || prettyCategory}</span>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground mb-8">
          {services.length > 0
            ? `${services.length} service${services.length > 1 ? "s" : ""} available`
            : "Discover local providers and book online"
          }
        </p>

        {services.length === 0 ? (
          <div className="space-y-12">
            {/* Engaging empty state */}
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  No providers listed yet for {title.toLowerCase()}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Be the first to offer {prettyCategory.toLowerCase()} services{prettyCity ? ` in ${prettyCity}` : ""}! 
                  List your service and reach travelers and property owners.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button asChild size="lg">
                    <Link to="/signup">List Your Service <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/marketplace">Browse All Services</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Suggest other categories in same city */}
            {otherCategories.length > 0 && prettyCity && (
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Other services{prettyCity ? ` in ${prettyCity}` : ""}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {otherCategories.map(s => (
                    <Link
                      key={s.slug}
                      to={`/shop/${s.slug}-${city}`}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      <span className="text-xl">{s.icon}</span>
                      <span className="text-sm font-medium text-foreground">{s.label}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Suggest same category in other cities */}
            {category && suggestedCities.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {prettyCategory} in other cities
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {suggestedCities.map(c => (
                    <Link
                      key={c.slug}
                      to={`/shop/${category}-${c.slug}`}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/50 transition-all"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Explore section */}
            <section className="text-center py-8">
              <Compass className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Or explore all available destinations</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button asChild variant="outline" size="sm"><Link to="/locations">All Locations</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/services">All Services</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/activities">Activities</Link></Button>
              </div>
            </section>
          </div>
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
      </main>

      <Footer />
    </div>
  );
}
