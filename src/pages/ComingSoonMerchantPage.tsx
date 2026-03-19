import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Store, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackDemandSignal } from "@/lib/growth/demand-engine";
import { generateMerchantSEO } from "@/lib/seo/seo-engine";

const ComingSoonMerchantPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [merchant, setMerchant] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [notified, setNotified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: shopData } = await (supabase as any)
        .from("storefront_pages")
        .select("*")
        .eq("public_slug", slug)
        .maybeSingle();

      if (shopData) {
        setShop(shopData);
        // Track page view
        trackDemandSignal({ entityId: shopData.id, entityType: "merchant", signalType: "page_view" });

        const { data: profile } = await (supabase as any)
          .from("merchant_onboarding_profiles")
          .select("*")
          .eq("shop_id", shopData.id)
          .maybeSingle();
        setMerchant(profile);
      }
      setLoading(false);
    })();
  }, [slug]);

  const handleNotify = async () => {
    if (shop) {
      await trackDemandSignal({ entityId: shop.id, entityType: "merchant", signalType: "notify_request" });
      setNotified(true);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Clock className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!shop) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Store not found</div>;

  const seo = generateMerchantSEO({
    merchantName: shop.name ?? "Store",
    city: shop.city ?? "",
    category: shop.vertical,
    slug: slug ?? "",
  });

  return (
    <>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <div className="min-h-screen bg-background">
        <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Store className="h-16 w-16 text-primary/40" />
          <Badge className="absolute top-4 right-4" variant="secondary">Coming Soon</Badge>
        </div>

        <div className="max-w-lg mx-auto p-6 -mt-8 relative">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h1 className="text-2xl font-bold text-foreground">{shop.name}</h1>
              
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin className="h-4 w-4" />
                <span>{shop.city ?? "Location coming soon"}</span>
                {shop.vertical && <Badge variant="outline">{shop.vertical}</Badge>}
              </div>

              <p className="text-muted-foreground text-sm">
                This store is coming soon to Easy-Locs. Get notified when it's ready to take orders!
              </p>

              <div className="space-y-3">
                {!notified ? (
                  <Button className="w-full" onClick={handleNotify}>
                    <Bell className="h-4 w-4 mr-2" />
                    Get Notified When Open
                  </Button>
                ) : (
                  <Button className="w-full" disabled variant="secondary">
                    ✓ You'll be notified!
                  </Button>
                )}

                {merchant?.status === "imported_not_claimed" && (
                  <Link to="/merchant/claim" className="block">
                    <Button variant="outline" className="w-full">
                      Is this your store? Claim it
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ComingSoonMerchantPage;
