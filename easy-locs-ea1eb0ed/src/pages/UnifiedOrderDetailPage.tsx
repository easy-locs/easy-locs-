/**
 * UnifiedOrderDetailPage — Single screen showing order + payment + delivery + tracking.
 * Route: /order/:orderId
 */
import { useParams, Link, useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, CreditCard, Truck, AlertTriangle, Package, User, Store, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useUnifiedOrder } from "@/hooks/useUnifiedOrder";
import UnifiedTimeline from "@/components/order/UnifiedTimeline";
import OrderCTABlock from "@/components/order/OrderCTABlock";
import OrderTrackingMap from "@/components/order/OrderTrackingMap";
import { ORDER_STATUS_DISPLAY, type UnifiedOrderStatus } from "@/lib/order/unified-order-types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { lazy, Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFoodOrderTrackingRealtime } from "@/hooks/useFoodOrderRealtime";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { db } from "@/services/db";

const RefundRequestButton = lazy(() => import("@/components/payments/RefundRequestButton"));

const fmtPrice = (n: number, c = "EUR") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  } catch { return `${n} ${c}`; }
};

export default function UnifiedOrderDetailPage() {
  useUiEngine("unifiedorderdetailpage");
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("changed_mind");
  const [returnDetails, setReturnDetails] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const {
    order, deliveryJob, driverSession, unifiedStatus, timeline,
    ctas, role, loading, updateOrderStatus, confirmReceived, cancelOrder, requestDelivery,
  } = useUnifiedOrder(orderId);

  useFoodOrderTrackingRealtime(orderId);

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
          navigate(`/s/${order.storefront_pages.slug}`);
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
      <SubPageShell noContentPad>
        <MobilePageHeader title="Order Details" icon={<ShoppingBag className="h-5 w-5 text-primary" />} backTo="/my-orders" />
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </SubPageShell>
    );
  }

  if (!order) {
    return (
      <SubPageShell noContentPad>
        <MobilePageHeader title="Order Details" icon={<ShoppingBag className="h-5 w-5 text-primary" />} backTo="/my-orders" />
        <EmptyState
          icon={ShoppingBag}
          title="Order not found"
          description="This order may have been removed or the link is invalid"
          action={{ label: "Go Back", onClick: () => window.history.back() }}
        />
      </SubPageShell>
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
      <SubPageShell noContentPad>
        <MobilePageHeader
          title={`Order #${orderId?.slice(0, 8).toUpperCase()}`}
          icon={<ShoppingBag className="h-5 w-5 text-primary" />}
          backTo="/my-orders"
        />

        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          {/* A. Status badge + shop */}
          <AppCard>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {shop?.logo_url ? (
                    <img loading="lazy" src={shop.logo_url} alt={`${shop?.name || "Shop"} logo`} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{shop?.name || "Shop"}</p>
                    <p className="text-[0.625rem] text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <Badge
                  className="text-[0.625rem] gap-1"
                  style={{ backgroundColor: `${statusDisplay.color}20`, color: statusDisplay.color, borderColor: `${statusDisplay.color}40` }}
                  variant="outline"
                >
                  {statusDisplay.icon} {statusDisplay.label}
                </Badge>
              </div>

              {/* Role indicator */}
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-[0.625rem] h-5">
                  <User className="h-2.5 w-2.5 mr-0.5" /> {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </AppCard>

          {/* B. Unified Timeline */}
          <AppCard>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Order Progress</p>
              <UnifiedTimeline events={timeline} vertical />
            </CardContent>
          </AppCard>

          {/* C. Payment Status */}
          <AppCard>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Payment</span>
                </div>
                <Badge variant="outline" className={cn(
                  "text-[0.625rem]",
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
                <p className="text-[0.625rem] text-muted-foreground mt-1">
                  Ref: <span className="font-mono">{order.wallet_reference_code}</span>
                </p>
              )}
            </CardContent>
          </AppCard>

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
            <AppCard>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Delivery</span>
                  <Badge variant="outline" className="text-[0.625rem] ml-auto">
                    {deliveryJob.status}
                  </Badge>
                </div>
                {deliveryJob.driver_id && driverSession && (
                  <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-[0.625rem] text-muted-foreground">Driver</p>
                      <p className="text-xs font-medium">{driverSession.user_id?.slice(0, 8) || "Assigned"}</p>
                    </div>
                  </div>
                )}
                {deliveryJob.pickup_address && (
                  <p className="text-[0.625rem] text-muted-foreground">📍 From: {deliveryJob.pickup_address}</p>
                )}
                {deliveryJob.dropoff_address && (
                  <p className="text-[0.625rem] text-muted-foreground">📍 To: {deliveryJob.dropoff_address}</p>
                )}
              </CardContent>
            </AppCard>
          )}

          {/* F. Order Items */}
          <AppCard>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-xs font-medium">Items</h2>
              </div>
              {items.map((item: { id: string; quantity: number; title: string; unit_price?: number; metadata?: { modifiers?: { optionName?: string }[]; notes?: string; allergens?: string[] } }) => {
                const mods = item.metadata?.modifiers ?? [];
                const itemNotes = item.metadata?.notes;
                const itemAllergens = item.metadata?.allergens ?? [];
                return (
                  <div key={item.id} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.quantity}× {item.title}</span>
                      <span className="font-medium">{fmtPrice(item.quantity * (item.unit_price || 0), order.currency)}</span>
                    </div>
                    {mods.length > 0 && (
                      <p className="text-[0.625rem] text-muted-foreground pl-4">
                        {mods.map((m) => m.optionName ?? "").join(", ")}
                      </p>
                    )}
                    {itemNotes && (
                      <p className="text-[0.625rem] text-muted-foreground italic pl-4">Note: {itemNotes}</p>
                    )}
                    {itemAllergens.length > 0 && (
                      <p className="text-[0.625rem] pl-4 font-medium" style={{ color: "hsl(0 72% 51%)" }}>
                        ⚠️ {itemAllergens.join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
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
          </AppCard>

          {/* Return request (for delivered orders within 14 days) */}
          {unifiedStatus === "delivered" && role === "buyer" && user?.id && (() => {
            const deliveredDaysAgo = Math.floor((Date.now() - new Date(order.updated_at || order.created_at).getTime()) / 86400000);
            if (deliveredDaysAgo > 14) return null;
            return (
              <>
                <Button
                  variant="outline"
                  className="w-full gap-2 h-10 text-sm"
                  onClick={() => setReturnDialogOpen(true)}
                >
                  <RotateCcw className="h-4 w-4" /> Request Return
                </Button>
                <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request a Return</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium">Reason</label>
                        <Select value={returnReason} onValueChange={setReturnReason}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="defective">Defective product</SelectItem>
                            <SelectItem value="wrong_size">Wrong size</SelectItem>
                            <SelectItem value="not_as_described">Not as described</SelectItem>
                            <SelectItem value="changed_mind">Changed mind</SelectItem>
                            <SelectItem value="damaged_in_transit">Damaged in transit</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium">Details (optional)</label>
                        <Textarea value={returnDetails} onChange={e => setReturnDetails(e.target.value)} className="mt-1" rows={3} placeholder="Describe the issue..." />
                      </div>
                      <Button
                        className="w-full"
                        disabled={submittingReturn}
                        onClick={async () => {
                          setSubmittingReturn(true);
                          try {
                            await db.from("product_returns").insert({
                              order_id: orderId,
                              buyer_id: user.id,
                              seller_id: order.seller_id,
                              reason: returnReason,
                              reason_details: returnDetails.trim() || null,
                              refund_amount: order.total,
                            });
                            toast({ title: "Return requested", description: "The seller will review your request." });
                            setReturnDialogOpen(false);
                          } catch {
                            toast({ title: "Error", description: "Could not submit return request", variant: "destructive" });
                          } finally {
                            setSubmittingReturn(false);
                          }
                        }}
                      >
                        {submittingReturn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Return Request"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            );
          })()}

          {/* G-bis. Refund request button */}
          {order.payment_status === "paid" && !isFailed && user?.id && (
            <Suspense fallback={<div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>}>
              <RefundRequestButton
                bookingId={orderId!}
                bookingType="storefront"
                amount={order.total}
                currency={order.currency}
                onRefundRequested={() => toast({ title: "Refund Requested", description: "Your refund request has been submitted for review." })}
              />
            </Suspense>
          )}

          {/* G. Exception/Support notice */}
          {isFailed && (
            <AppCard className="border-destructive/30">
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
                  <p className="text-[0.625rem] text-muted-foreground mt-1">{order.notes}</p>
                )}
              </CardContent>
            </AppCard>
          )}

          {/* H. Actions */}
          <OrderCTABlock ctas={ctas} onAction={handleAction} />
        </div>
      </SubPageShell>
    </>
  );
}
