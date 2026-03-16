/**
 * MultiVendorDashboard — Platform-wide vendor rankings, commissions, featured shops.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, TrendingUp, Star, Award, DollarSign, Loader2 } from "lucide-react";

interface Props {
  shopId: string;
}

export default function MultiVendorDashboard({ shopId }: Props) {
  // Commission data
  const { data: commission, isLoading } = useQuery({
    queryKey: ["vendor-commission", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("vendor_commissions")
        .select("*")
        .eq("shop_id", shopId)
        .maybeSingle();
      return data;
    },
  });

  // Featured status
  const { data: featured } = useQuery({
    queryKey: ["featured-shop", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("featured_shops")
        .select("*")
        .eq("shop_id", shopId)
        .maybeSingle();
      return data;
    },
  });

  // Top shops ranking
  const { data: topShops = [] } = useQuery({
    queryKey: ["top-shops"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("vendor_commissions")
        .select("shop_id, total_earned, currency")
        .order("total_earned", { ascending: false })
        .limit(10);
      if (!data?.length) return [];
      const shopIds = data.map((d: any) => d.shop_id);
      const { data: shops } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, logo_url, slug")
        .in("id", shopIds);
      return data.map((d: any) => ({
        ...d,
        shop: shops?.find((s: any) => s.id === d.shop_id),
      }));
    },
  });

  const fmt = (n: number) => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Store className="h-4 w-4 text-primary" /> Multi-Vendor Dashboard
      </h3>

      {/* Commission stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <DollarSign className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-foreground">{fmt(commission?.total_earned || 0)}</p>
            <p className="text-[10px] text-muted-foreground">Total Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-foreground">{fmt(commission?.pending_payout || 0)}</p>
            <p className="text-[10px] text-muted-foreground">Pending Payout</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-foreground">{commission?.platform_rate || 5}%</p>
            <p className="text-[10px] text-muted-foreground">Platform Fee</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            {featured ? (
              <>
                <Award className="h-4 w-4 mx-auto text-warning mb-1" />
                <Badge className="bg-warning/20 text-warning text-[10px]">{featured.tier} ⭐</Badge>
                <p className="text-[10px] text-muted-foreground mt-1">Featured Shop</p>
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Not featured</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top vendors ranking */}
      {topShops.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2">🏆 Top Vendors</h4>
            <div className="space-y-2">
              {topShops.slice(0, 5).map((v: any, i: number) => (
                <div key={v.shop_id} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  {v.shop?.logo_url ? (
                    <img src={v.shop.logo_url} alt="" className="w-6 h-6 rounded-lg object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                      <Store className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-xs font-medium text-foreground flex-1 truncate">{v.shop?.name || "Shop"}</span>
                  <span className="text-xs font-mono text-primary">{fmt(v.total_earned)} {v.currency}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
