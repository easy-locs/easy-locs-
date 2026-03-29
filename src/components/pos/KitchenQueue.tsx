/**
 * KitchenQueue — Realtime POS order queue for merchants.
 * 4-column KDS: New → Accepted → Preparing → Ready
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ChefHat, Clock, CheckCircle2, Package } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

const db = supabase as any;

interface KitchenQueueProps {
  shopId: string;
}

type OrderStatus = "paid" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";

const COLUMNS: { status: OrderStatus; label: string; icon: any; color: string }[] = [
  { status: "paid", label: "New", icon: Clock, color: "text-blue-500" },
  { status: "confirmed", label: "Accepted", icon: CheckCircle2, color: "text-green-500" },
  { status: "preparing", label: "Preparing", icon: ChefHat, color: "text-orange-500" },
  { status: "ready", label: "Ready", icon: Package, color: "text-primary" },
];

export default function KitchenQueue({ shopId }: KitchenQueueProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["kitchen-queue", shopId],
    queryFn: async () => {
      const { data } = await db
        .from("storefront_orders")
        .select("id, status, total_amount, currency, items_json, notes, fulfillment_type, created_at, customer_name, customer_phone")
        .eq("shop_id", shopId)
        .in("status", ["paid", "confirmed", "preparing", "ready"])
        .order("created_at", { ascending: true })
        .limit(50);
      return data ?? [];
    },
    refetchInterval: 10_000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`kitchen-${shopId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "storefront_orders",
        filter: `shop_id=eq.${shopId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["kitchen-queue", shopId] });
      })
      .subscribe();

    return () => { removeRealtimeChannel(channel); };
  }, [shopId, qc]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    haptic("light");
    try {
      const { error } = await db
        .from("storefront_orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["kitchen-queue", shopId] });
      toast.success(`Order → ${newStatus}`);
    } catch {
      toast.error("Failed to update order");
    } finally {
      setUpdatingId(null);
    }
  };

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    const map: Record<string, OrderStatus> = {
      paid: "confirmed",
      confirmed: "preparing",
      preparing: "ready",
      ready: "completed",
    };
    return map[current] ?? null;
  };

  const getNextLabel = (current: OrderStatus): string => {
    const map: Record<string, string> = {
      paid: "Accept",
      confirmed: "Start Prep",
      preparing: "Mark Ready",
      ready: "Complete",
    };
    return map[current] ?? "Next";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const parseItems = (json: any): { title: string; qty: number; price: number }[] => {
    try {
      if (typeof json === "string") return JSON.parse(json);
      if (Array.isArray(json)) return json;
      return [];
    } catch { return []; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <ChefHat className="w-5 h-5" />
          Kitchen Queue
        </h2>
        <Badge variant="outline" className="text-xs">
          {orders.length} active
        </Badge>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <ChefHat className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map((col) => {
            const colOrders = orders.filter((o: any) => o.status === col.status);
            return (
              <div key={col.status} className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <col.icon className={`w-4 h-4 ${col.color}`} />
                  <span className="text-xs font-bold text-foreground">{col.label}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{colOrders.length}</Badge>
                </div>

                {colOrders.map((order: any) => {
                  const items = parseItems(order.items_json);
                  const next = getNextStatus(order.status);
                  return (
                    <Card key={order.id} className="border-border/30">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {order.customer_name && (
                          <p className="text-xs font-medium text-foreground">{order.customer_name}</p>
                        )}

                        <div className="space-y-0.5">
                          {items.slice(0, 5).map((item, i) => (
                            <div key={i} className="flex justify-between text-[11px]">
                              <span className="text-foreground">{item.qty}× {item.title}</span>
                            </div>
                          ))}
                          {items.length > 5 && (
                            <span className="text-[10px] text-muted-foreground">+{items.length - 5} more</span>
                          )}
                        </div>

                        {order.notes && (
                          <p className="text-[10px] text-accent-foreground bg-accent/30 rounded px-2 py-1">
                            📝 {order.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-foreground">
                            {formatMoneyByCountry(Number(order.total_amount || 0), null, order.currency || "AED")}
                          </span>
                          {next && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] rounded-lg active:scale-[0.97]"
                              onClick={() => updateStatus(order.id, next)}
                              disabled={updatingId === order.id}
                            >
                              {updatingId === order.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                getNextLabel(order.status)
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
