import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { buildAppUrl } from "@/lib/app-domain";
import { MapPin, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const fmtPrice = (amount: number, currency: string = "EUR") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

export default function StorePage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();

  const { data: showcase, isLoading } = useQuery({
    queryKey: ["store-showcase", storeSlug],
    queryFn: async () => {
      // Try landlord_profiles first, then marketplace_providers
      const { data: landlord } = await supabase
        .from("landlord_profiles")
        .select("*")
        .eq("slug", storeSlug!)
        .eq("active", true)
        .maybeSingle();

      if (landlord) {
        const { data: services } = await supabase
          .from("concierge_services_public" as any)
          .select("*")
          .eq("org_id", landlord.org_id)
          .order("sort_order");

        return { type: "landlord" as const, profile: landlord, services: services || [] };
      }

      const { data: provider } = await supabase
        .from("marketplace_providers")
        .select("*")
        .eq("slug", storeSlug!)
        .eq("active", true)
        .maybeSingle();

      if (provider) {
        const { data: services } = await supabase
          .from("marketplace_services_public" as any)
          .select("*")
          .eq("provider_id", provider.id)
          .order("sort_order");

        return { type: "provider" as const, profile: provider, services: (services || []) };
      }

      return null;
    },
    enabled: !!storeSlug,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!showcase) return (
    <>
      <SEOHead title="Store not found | Easy-Locs" description="This store does not exist." />
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Store not found</p>
      </div>
    </>
  );

  const profile = showcase.profile as Record<string, any>;
  const name = profile.display_name || profile.company_name || storeSlug;

  return (
    <>
      <SEOHead
        title={`${name} — Store | Easy-Locs`}
        description={profile.bio || `Browse services by ${name}`}
        ogImage={profile.avatar_url || profile.cover_photo_url}
        canonical={buildAppUrl(`/store/${storeSlug}`)}
      />
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-accent/10 to-background border-b border-border">
          <div className="max-w-5xl mx-auto px-4 py-10 text-center">
            {profile.avatar_url && (
              <img src={profile.avatar_url} alt={name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-2 border-border" />
            )}
            <h1 className="text-3xl font-bold text-foreground">{name}</h1>
            {profile.city && (
              <p className="text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <MapPin className="h-4 w-4" /> {profile.city}{profile.country ? `, ${profile.country}` : ""}
              </p>
            )}
            {profile.bio && <p className="text-muted-foreground mt-2 max-w-xl mx-auto">{profile.bio}</p>}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold text-foreground mb-6">Services ({showcase.services.length})</h2>
          {showcase.services.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No services listed yet</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {showcase.services.map((s: any) => {
                const photo = s.photo_url || (Array.isArray(s.photo_urls) && s.photo_urls[0]);
                const slug = s.booking_slug;
                return (
                  <Card key={s.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {photo && (
                      <div className="aspect-video bg-muted">
                        <img src={photo} alt={s.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold text-foreground truncate">{s.title}</h3>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">{s.category}</Badge>
                        <span className="font-bold text-accent">{fmtPrice(s.price, s.currency)}</span>
                      </div>
                      {slug && (
                        <Button size="sm" className="w-full mt-2" asChild>
                          <Link to={`/book/${slug}`}><ExternalLink className="h-3 w-3 mr-1" /> Book</Link>
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
