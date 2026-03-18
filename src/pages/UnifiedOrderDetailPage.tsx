/**
 * UnifiedOrderDetailPage — Single screen showing order + payment + delivery + tracking.
 * Route: /order/:orderId
 */
import { useParams, Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, ArrowLeft, CreditCard, Truck, AlertTriangle, Package, User, Store } from "lucide-react";
import MapEmptyState from "@/components/map/MapEmptyState";
import { useUnifiedOrder } from "@/hooks/useUnifiedOrder";
import UnifiedTimeline from "@/components/order/UnifiedTimeline";
import OrderCTABlock from "@/components/order/OrderCTABlock";
import OrderTrackingMap from "@/components/order/OrderTrackingMap";
import { ORDER_STATUS_DISPLAY, type UnifiedOrderStatus } from "@/lib/order/unified-order-types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const fmtPrice = (n: number, c = "EUR") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  } catch { return `${n} ${c}`; }
};

export default function UnifiedOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();
  const {
    order, deliveryJob, driverSession, unifiedStatus, timeline,
    ctas, role, loading, updateOrderStatus, confirmReceived, cancelOrder, requestDelivery,
  } = useUnifiedOrder(orderId);

  const handleAction = async (action: string) => {
    switch (action) {
      case "cancel":
        await cancelOrder("Cancelled by user");
        break;
      case "confirm_received":
        await confirmReceived();
        break;
      case "mark_preparing":
        await updateOrderStatus("preparing");
        break;
      case "mark_ready":
        await updateOrderStatus("ready_for_pickup");
        break;
      case "request_driver":
        await requestDelivery();
        break;
      case "confirm_handoff":
        await updateOrderStatus("completed");
        break;
      case "track":
        // Scroll to map
        document.getElementById("tracking-map")?.scrollIntoView({ behavior: "smooth" });
        break;
      case "contact_seller":
      case "contact_buyer":
      case "contact_driver":
        toast({ title: "Opening chat...", description: "Contact feature available via messages" });
        break;
      case "reorder":
        if (order?.storefront_pages?.slug) {
          window.location.hash = `/s/${order.storefront_pages.slug}`;
        }
        break;
      case "support":
        toast({ title: "Support", description: "Please contact the seller for assistance" });
        break;
      default:
        toast({ title: action.replace(/_/g, " ") });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobilePageHeader title="Order Details" icon={<ShoppingBag className="h-5 w-5 text-primary" />} backTo="/my-orders" />
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobilePageHeader title="Order Details" icon={<ShoppingBag className="h-5 w-5 text-primary" />} backTo="/my-orders" />
        <MapEmptyState
          icon={<ShoppingBag className="h-6 w-6 text-muted-foreground/40" />}
          title="Order not found"
          subtitle="This order may have been removed or the link is invalid"
          onRetry={() => window.history.back()}
          retryLabel="Go Back"
        />
      </div>
    );
  }

  const statusDisplay = ORDER_STATUS_DISPLAY[unifiedStatus] || ORDER_STATUS_DISPLAY.pending_payment;
  const shop = order.storefront_pages;
  const items = order.storefront_order_items || [];
  const isDeliveryActive = deliveryJob && !["completed", "cancelled", "failed"].includes(deliveryJob.status);
  const isFailed = ["cancelled", "refunded", "failed"].includes(unifiedStatus);

  return (
    <>
      <SEOHead title={`Order #${orderId?.slice(0, 8).toUpperCase()}`} description="Track your order in real time" />
      <div className="min-h-screen bg-background pb-20">
        <MobilePageHeader
          title={`Order #${orderId?.slice(0, 8).toUpperCase()}`}
          icon={<ShoppingBag className="h-5 w-5 text-primary" />}
          backTo="/my-orders"
        />

        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          {/* A. Status badge + shop */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {shop?.logo_url ? (
                    <img src={shop.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{shop?.name || "Shop"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <Badge
                  className="text-[10px] gap-1"
                  style={{ backgroundColor: `${statusDisplay.color}20`, color: statusDisplay.color, borderColor: `${statusDisplay.color}40` }}
                  variant="outline"
                >
                  {statusDisplay.icon} {statusDisplay.label}
                </Badge>
              </div>

              {/* Role indicator */}
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-[9px] h-5">
                  <User className="h-2.5 w-2.5 mr-0.5" /> {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* B. Unified Timeline */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Order Progress</p>
              <UnifiedTimeline events={timeline} vertical />
            </CardContent>
          </Card>

          {/* C. Payment Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Payment</span>
                </div>
                <Badge variant="outline" className={cn(
                  "text-[10px]",
                  order.payment_status === "secured" || order.payment_status === "released" ? "border-success/40 text-success" :
                  order.payment_status === "failed" ? "border-destructive/40 text-destructive" : ""
                )}>
                  {order.payment_status === "released" ? "✅ Released" :
                   order.payment_status === "secured" ? "🔒 Secured" :
                   order.payment_status === "failed" ? "❌ Failed" :
                   order.payment_method === "wallet" ? "💰 Wallet" : "⏳ Pending"}
                </Badge>
              </div>
              {order.wallet_reference_code && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ref: <span className="font-mono">{order.wallet_reference_code}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* D. Tracking Map (if delivery active) */}
          {(order.requires_delivery || order.delivery_job_id) && (
            <div id="tracking-map">
              <OrderTrackingMap
                pickupLat={deliveryJob?.pickup_lat}
                pickupLng={deliveryJob?.pickup_lng}
                dropoffLat={order.delivery_lat || deliveryJob?.dropoff_lat}
                dropoffLng={order.delivery_lng || deliveryJob?.dropoff_lng}
                driverLat={driverSession?.lat}
                driverLng={driverSession?.lng}
                status={deliveryJob?.status}
              />
            </div>
          )}

          {/* E. Delivery info */}
          {deliveryJob && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Delivery</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {deliveryJob.status}
                  </Badge>
                </div>
                {deliveryJob.driver_id && driverSession && (
                  <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Driver</p>
                      <p className="text-xs font-medium">{driverSession.user_id?.slice(0, 8) || "Assigned"}</p>
                    </div>
                  </div>
                )}
                {deliveryJob.pickup_address && (
                  <p className="text-[10px] text-muted-foreground">📍 From: {deliveryJob.pickup_address}</p>
                )}
                {deliveryJob.dropoff_address && (
                  <p className="text-[10px] text-muted-foreground">📍 To: {deliveryJob.dropoff_address}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* F. Order Items */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Items</span>
              </div>
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{item.quantity}× {item.title}</span>
                  <span className="font-medium">{fmtPrice(item.quantity * (item.unit_price || 0), order.currency)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                {order.shipping_fee > 0 && (
                  <div className="flex items-center justify-between text-xs w-full mb-1">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{fmtPrice(order.shipping_fee, order.currency)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Total</span>
                <span className="text-sm font-bold text-primary">{fmtPrice(order.total || 0, order.currency)}</span>
              </div>
            </CardContent>
          </Card>

          {/* G. Exception/Support notice */}
          {isFailed && (
            <Card className="border-destructive/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <p className="text-xs text-destructive font-medium">
                    {unifiedStatus === "cancelled" ? "This order was cancelled" :
                     unifiedStatus === "refunded" ? "This order has been refunded" :
                     "This order encountered an issue"}
                  </p>
                </div>
                {order.notes && (
                  <p className="text-[10px] text-muted-foreground mt-1">{order.notes}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* H. Actions */}
          <OrderCTABlock ctas={ctas} onAction={handleAction} />
        </div>
      </div>
    </>
  );
}
