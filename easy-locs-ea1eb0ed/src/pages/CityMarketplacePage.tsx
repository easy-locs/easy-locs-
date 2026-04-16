import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AppCard, CardContent, CardHeader, CardTitle } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Store, TrendingUp, Users } from "lucide-react";
import { storefrontService } from "@/services";
import { governStorefrontQuery } from "@/lib/discovery/query-governance";
import { generateCitySEO } from "@/lib/seo/seo-engine";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const CityMarketplacePage = () => {
  useUiEngine("city-marketplace");
  const { citySlug } = useParams<{ citySlug: string }>();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cityName = (citySlug ?? "").replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  useEffect(() => {
    if (!citySlug) return;
    (async () => {
      const data = await storefrontService.fetchByCity(cityName, (q: any) => governStorefrontQuery(q, "discover"), 100);
      setMerchants(data as any[]);
      setLoading(false);
    })();
  }, [citySlug]);

  const active = merchants.length;
  const comingSoon = 0;
  const seo = generateCitySEO({ city: cityName, countryName: "", merchantCount: merchants.length });

  return (
    <>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <SubPageShell contentClassName="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Food Delivery in {cityName}</h1>
            <p className="text-sm text-muted-foreground">{merchants.length} restaurants · {active} active · {comingSoon} coming soon</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <AppCard><CardContent className="p-4 text-center">
            <Store className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold text-foreground">{merchants.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent></AppCard>
          <AppCard><CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-xl font-bold text-foreground">{active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent></AppCard>
          <AppCard><CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-xl font-bold text-foreground">{comingSoon}</p>
            <p className="text-xs text-muted-foreground">Coming Soon</p>
          </CardContent></AppCard>
        </div>

        <div className="space-y-3">
          {merchants.map((m) => (
            <AppCard key={m.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.vertical}</p>
                </div>
                <Badge variant={m.status === "coming_soon" ? "secondary" : "default"}>
                  {m.status === "coming_soon" ? "Coming Soon" : "Order Now"}
                </Badge>
              </CardContent>
            </AppCard>
          ))}
          {merchants.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-8">No restaurants found in {cityName} yet</p>
          )}
        </div>
      </SubPageShell>
    </>
  );
};

export default CityMarketplacePage;
