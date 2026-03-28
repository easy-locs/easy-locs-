/**
 * SubscriptionManager — Seller view of active product subscriptions.
 * Shows subscriber list, frequencies, MRR, and management actions.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Repeat, Users, DollarSign, Loader2, Calendar } from "lucide-react";

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

const FREQ_LABEL: Record<string, string> = {
  weekly: "Weekly", biweekly: "Bi-weekly", monthly: "Monthly", quarterly: "Quarterly",
};

export default function SubscriptionManager({ shopId }: { shopId: string }) {
  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["shop-subscriptions", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_subscriptions")
        .select("*, catalog_items(title, photo_url)")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  if (isLoading) return <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;

  const active = subs.filter((s: any) => s.status === "active");
  const mrr = active.reduce((sum: number, s: any) => {
    const price = (s.unit_price || 0) * (s.quantity || 1);
    const multiplier = s.frequency === "weekly" ? 4.33 : s.frequency === "biweekly" ? 2.17 : s.frequency === "quarterly" ? 0.33 : 1;
    return sum + price * multiplier;
  }, 0);
  const currency = active[0]?.currency || "EUR";

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Subscriptions</h4>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <Users className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{active.length}</p>
            <p className="text-[9px] text-muted-foreground">Active</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <DollarSign className="h-4 w-4 mx-auto text-success mb-1" />
            <p className="text-lg font-bold">{fmtPrice(mrr, currency)}</p>
            <p className="text-[9px] text-muted-foreground">Est. MRR</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <Calendar className="h-4 w-4 mx-auto text-info mb-1" />
            <p className="text-lg font-bold">{subs.reduce((s: number, sub: any) => s + (sub.total_orders || 0), 0)}</p>
            <p className="text-[9px] text-muted-foreground">Total Orders</p>
          </div>
        </div>

        {subs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No subscriptions yet</p>
        ) : (
          subs.slice(0, 10).map((sub: any) => (
            <div key={sub.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
              {sub.catalog_items?.photo_url ? (
                <img src={sub.catalog_items.photo_url} alt="" className="w-8 h-8 rounded object-cover" />
              ) : (
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                  <Repeat className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium line-clamp-2 break-words leading-snug">{sub.catalog_items?.title || "Item"}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{sub.buyer_email}</span>
                  <Badge variant="outline" className="text-[8px] px-1">{FREQ_LABEL[sub.frequency] || sub.frequency}</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold">{fmtPrice(sub.unit_price * sub.quantity, sub.currency)}</p>
                <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-[8px]">{sub.status}</Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
