/**
 * OrderReceiptPage — Unified digital receipt for all payment types.
 * Handles storefront orders, hotel bookings, and marketplace bookings.
 * Route: /order/receipt/:orderId
 */
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrderWithItems, getOrderStatusHistory } from "@/lib/orders/orderEngine";
import { db } from "@/services/db";
import OrderReceipt from "@/components/order/OrderReceipt";
import UnifiedTimeline from "@/components/order/UnifiedTimeline";
import { buildUnifiedTimeline } from "@/lib/order/unified-order-types";
import { Loader2, CalendarDays, MapPin, BedDouble, Users, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

type ReceiptType = "order" | "hotel_booking" | "unknown";

function detectReceiptType(orderId: string): { type: ReceiptType; realId: string } {
  if (orderId.startsWith("hotel-")) {
    return { type: "hotel_booking", realId: orderId.replace("hotel-", "") };
  }
  return { type: "order", realId: orderId };
}

export default function OrderReceiptPage() {
  useUiEngine("orderreceiptpage");
  const navigate = useNavigate();
  const { orderId = "" } = useParams();
  const { type, realId } = detectReceiptType(orderId);

  const { data, isLoading } = useQuery({
    queryKey: ["order-receipt-page", orderId],
    queryFn: async () => {
      if (type === "hotel_booking") {
        const { data: booking, error } = await db
          .from("hotel_bookings")
          .select("*, hotels(name, city, country, cover_image, stars)")
          .eq("id", realId)
          .maybeSingle();
        if (error) throw error;
        return { type: "hotel_booking" as const, booking, order: null, history: [] };
      }

      const order = await getOrderWithItems(realId);
      const history = await getOrderStatusHistory(realId);
      return { type: "order" as const, order, history, booking: null };
    },
    enabled: !!realId,
    staleTime: 10000,
  });

  const order = data?.order;
  const booking = data?.booking;
  const items = order?.storefront_order_items ?? [];
  const history = data?.history ?? [];
  const timeline = order ? buildUnifiedTimeline(order, null) : [];

  return (
    <SubPageShell
      title={data?.type === "hotel_booking" ? "Booking Receipt" : "Order Receipt"}
      subtitle={realId ? `#${realId.slice(0, 8).toUpperCase()}` : undefined}
      onBack={() => navigate("/my-orders")}
      noContentPad
    >
      <div className="px-4 pt-3 space-y-4 pb-8">
        {isLoading && (
          <div className="py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        )}

        {!isLoading && !order && !booking && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Receipt not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/my-orders")}>
              Back to Orders
            </Button>
          </div>
        )}

        {!isLoading && data?.type === "hotel_booking" && booking && (
          <>
            <div className="flex flex-col items-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
              <h2 className="text-lg font-bold text-foreground">Booking Receipt</h2>
              <p className="text-xs text-muted-foreground">
                {booking.payment_status === "paid" ? "Payment confirmed" : `Status: ${booking.payment_status || booking.status}`}
              </p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3">
                {booking.hotels && (
                  <div className="flex items-center gap-3">
                    {booking.hotels.cover_image && (
                      <img src={booking.hotels.cover_image} alt={booking.hotels.name} className="w-14 h-14 rounded-xl object-cover" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-foreground">{booking.hotels.name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" /> {booking.hotels.city}, {booking.hotels.country}
                      </p>
                    </div>
                  </div>
                )}

                <div className="border-t border-border/10 pt-3 space-y-2">
                  {booking.booking_reference && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Reference</span>
                      <span className="font-bold text-primary">{booking.booking_reference}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Check-in</span>
                    <span className="text-foreground font-medium">{booking.checkin_date}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Check-out</span>
                    <span className="text-foreground font-medium">{booking.checkout_date}</span>
                  </div>
                  {booking.nights && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><BedDouble className="h-3 w-3" /> Nights</span>
                      <span className="text-foreground font-medium">{booking.nights}</span>
                    </div>
                  )}
                  {(booking.adults || booking.children) && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Guests</span>
                      <span className="text-foreground font-medium">
                        {booking.adults} adult{booking.adults > 1 ? "s" : ""}
                        {booking.children > 0 && `, ${booking.children} child${booking.children > 1 ? "ren" : ""}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/10 pt-3">
                  {booking.taxes > 0 && (
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Taxes</span>
                      <span className="text-foreground">{booking.currency} {Number(booking.taxes).toFixed(2)}</span>
                    </div>
                  )}
                  {booking.fees > 0 && (
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Fees</span>
                      <span className="text-foreground">{booking.currency} {Number(booking.fees).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">{booking.currency} {Number(booking.total_price).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => navigate("/travel/stays")} className="w-full rounded-2xl">
              Back to Hotels
            </Button>
          </>
        )}

        {!isLoading && data?.type === "order" && order && (
          <>
            <OrderReceipt order={order} items={items} />

            {timeline.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">Order Timeline</p>
                  <UnifiedTimeline events={timeline} vertical />
                </CardContent>
              </Card>
            )}

            {history.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Status History</p>
                  {history.map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between text-[11px] py-1 border-b border-border/30 last:border-0">
                      <span className="font-medium text-foreground capitalize">{h.status}</span>
                      <span className="text-muted-foreground">
                        {h.actor_type} · {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Button onClick={() => navigate(`/order/${order.id}`)} className="w-full rounded-2xl">
              Track Order
            </Button>
          </>
        )}
      </div>
    </SubPageShell>
  );
}
