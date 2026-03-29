/**
 * DeliveryDispatch — Seller-side: request delivery for shipped orders.
 * Connects storefront orders to mobility_jobs via dispatch-ride edge function.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as storefrontRepo from "@/repositories/storefront.repository";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Loader2, MapPin, Package, Send } from "lucide-react";
import { toast } from "sonner";

export default function DeliveryDispatch({ shopId }: { shopId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["dispatch-orders", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_orders")
        .select("id, buyer_name, buyer_email, shipping_address, total, currency, status, delivery_requested, delivery_job_id, created_at")
        .eq("shop_id", shopId)
        .in("status", ["accepted", "preparing", "shipped"])
        .eq("delivery_requested", false)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const requestDelivery = async (order: any) => {
    if (!pickupAddress.trim()) return toast.error("Enter a pickup address");
    if (!order.shipping_address) return toast.error("Order has no shipping address");
    // V4 dedup guard: never create two delivery jobs for same order
    if (order.delivery_job_id) return toast.info("Delivery already dispatched for this order");
    setDispatching(order.id);
    try {
      // Get user's org
      const orgMemberId = await storefrontRepo.fetchUserOrgId(user!.id);
      if (!orgMemberId) throw new Error("No organization found");

      const result = await storefrontRepo.invokeDispatchRide({
        action: "create_job",
        job_type: "parcel_delivery",
        service_level: "parcel_standard",
        pickup_address: pickupAddress,
        dropoff_address: order.shipping_address,
        notes: `Storefront order for ${order.buyer_name || order.buyer_email}`,
        quoted_price: 0,
        currency: "AED",
        order_id: order.id,
        merchant_id: orgMemberId,
      });



      // Link job to order
      await (supabase as any)
        .from("storefront_orders")
        .update({ delivery_job_id: job.id, delivery_requested: true, delivery_status: "pending" })
        .eq("id", order.id);

      qc.invalidateQueries({ queryKey: ["dispatch-orders", shopId] });
      toast.success("Delivery requested!");
    } catch (e: any) {
      toast.error(e.message || "Failed to request delivery");
    } finally {
      setDispatching(null);
    }
  };

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Request Delivery</h4>
          <Badge variant="outline" className="text-[10px] ml-auto">{orders.length} ready</Badge>
        </div>

        <div>
          <Label className="text-[10px]">Pickup Address</Label>
          <Input
            value={pickupAddress}
            onChange={e => setPickupAddress(e.target.value)}
            placeholder="Your warehouse / shop address"
            className="h-8 text-xs mt-1"
          />
        </div>

        {orders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No orders ready for dispatch</p>
        ) : (
          <div className="space-y-2">
            {orders.map((order: any) => (
              <div key={order.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">{order.buyer_name || order.buyer_email}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" />
                      {order.shipping_address || "No address"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] capitalize">{order.status}</Badge>
                </div>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs gap-1"
                  onClick={() => requestDelivery(order)}
                  disabled={dispatching === order.id || !order.shipping_address}
                >
                  {dispatching === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Dispatch Delivery
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
