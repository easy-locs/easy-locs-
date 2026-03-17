/**
 * NotificationIntelligence — PASS134: Event-driven smart notifications.
 * Abandoned cart reminders, inactive reactivation, reorder suggestions, loyalty alerts.
 * All automated via DB triggers + storefront-reactions. This component shows the seller view.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell, ShoppingCart, RotateCcw, UserMinus, Trophy,
  Loader2, TrendingUp,
} from "lucide-react";

const TYPE_META: Record<string, { icon: typeof Bell; label: string; color: string }> = {
  abandoned_cart: { icon: ShoppingCart, label: "Abandoned Cart", color: "text-warning" },
  reorder_suggestion: { icon: RotateCcw, label: "Reorder Suggestion", color: "text-primary" },
  inactive_reactivation: { icon: UserMinus, label: "Inactive Reactivation", color: "text-destructive" },
  loyalty_alert: { icon: Trophy, label: "Loyalty Alert", color: "text-info" },
};

interface Props {
  shopId: string;
}

export default function NotificationIntelligence({ shopId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["notif-intelligence", shopId],
    queryFn: async () => {
      const { data: notifs } = await (supabase as any)
        .from("storefront_auto_notifications")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(50);

      const items = notifs || [];

      // Group by type for summary
      const summary: Record<string, number> = {};
      items.forEach((n: any) => {
        summary[n.notification_type] = (summary[n.notification_type] || 0) + 1;
      });

      return { items, summary, total: items.length };
    },
    enabled: !!shopId,
    staleTime: 30_000,
  });

  if (isLoading) return null;
  if (!data || data.total === 0) return null;

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Smart Alerts
          </h4>
          <Badge variant="outline" className="text-[8px]">{data.total} events</Badge>
        </div>

        {/* Summary badges */}
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(data.summary).map(([type, count]) => {
            const meta = TYPE_META[type] || { icon: Bell, label: type, color: "text-muted-foreground" };
            const Icon = meta.icon;
            return (
              <div key={type} className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-[9px]">
                <Icon className={`h-3 w-3 ${meta.color}`} />
                <span className="font-medium">{meta.label}</span>
                <Badge variant="secondary" className="text-[8px] h-4 ml-0.5">{count}</Badge>
              </div>
            );
          })}
        </div>

        {/* Recent notifications */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {data.items.slice(0, 8).map((n: any) => {
            const meta = TYPE_META[n.notification_type] || { icon: Bell, label: n.notification_type, color: "text-muted-foreground" };
            const Icon = meta.icon;
            const payload = n.payload_json || {};
            return (
              <div key={n.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                <Icon className={`h-3 w-3 shrink-0 ${meta.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium">{meta.label}</p>
                  <p className="text-[9px] text-muted-foreground truncate">
                    {n.buyer_email || `Cart #${payload.cart_id?.slice(0, 8) || ""}` || "—"}
                  </p>
                </div>
                <span className="text-[8px] text-muted-foreground shrink-0">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
