/**
 * MyShopsPage — V7 dedicated "My Shops" page inside My Business.
 * Each shop card: logo, name, status, city + 2 clear buttons: Manage / Open Public.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Settings, ExternalLink, Plus, MapPin } from "lucide-react";
import { haptic } from "@/lib/haptics";

export default function MyShopsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: shops, isLoading } = useQuery({
    queryKey: ["my-shops", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, slug, logo_url, description, published, vertical, city, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <MobilePageHeader title="My Shops" backTo="/business" />

      <div className="px-4 pt-3 pb-4 space-y-3 max-w-2xl mx-auto w-full">
        {/* Create shop CTA */}
        <button
          onClick={() => { haptic("light"); navigate("/dashboard/my-shop"); }}
          className="w-full active:scale-[0.98] transition-all"
        >
          <div className="rounded-2xl border-2 border-dashed border-primary/30 p-4 flex items-center gap-3 hover:border-primary/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Create New Shop</p>
              <p className="text-xs text-muted-foreground">Set up a new storefront</p>
            </div>
          </div>
        </button>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && (!shops || shops.length === 0) && (
          <EmptyState
            icon={Store}
            title="No shops yet"
            description="Create your first shop to start selling."
          />
        )}

        {/* Shop cards */}
        {shops?.map((shop: any) => (
          <Card key={shop.id} className="overflow-hidden border-border/40">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                {shop.logo_url ? (
                  <img
                    src={shop.logo_url}
                    alt={shop.name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{shop.name}</p>
                  {shop.city && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {shop.city}
                    </p>
                  )}
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      shop.published
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${shop.published ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {shop.published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2 Clear action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs font-semibold"
                  onClick={() => { haptic("light"); navigate("/dashboard/my-shop"); }}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Manage Shop
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs font-semibold"
                  onClick={() => { haptic("light"); navigate(`/s/${shop.slug}`); }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Public Shop
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
