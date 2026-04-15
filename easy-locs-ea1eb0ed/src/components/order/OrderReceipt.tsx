/**
 * OrderReceipt — Digital receipt component showing full order breakdown.
 * Renders from real order + items data.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Receipt, Store } from "lucide-react";
import { formatMoneyByCountry } from "@/lib/currency-engine";

interface ReceiptItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

interface OrderReceiptProps {
  order: {
    id: string;
    created_at: string;
    status: string;
    payment_status: string;
    payment_method?: string;
    subtotal: number;
    delivery_fee?: number;
    shipping_fee?: number;
    total: number;
    currency: string;
    notes?: string;
    storefront_pages?: { name: string; logo_url?: string; slug?: string } | null;
  };
  items: ReceiptItem[];
}

function fmtPrice(n: number, c?: string) {
  return formatMoneyByCountry(Number(n || 0), null, c);
}

export default function OrderReceipt({ order, items }: OrderReceiptProps) {
  const shop = order.storefront_pages;
  const fee = order.delivery_fee ?? order.shipping_fee ?? 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 text-center" style={{ background: "hsl(var(--primary) / 0.05)" }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            {shop?.logo_url ? (
              <img loading="lazy" src={shop.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="h-4 w-4 text-primary" />
              </div>
            )}
            <span className="text-sm font-bold text-foreground">{shop?.name || "Store"}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">Receipt</span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Meta */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>#{order.id.slice(0, 8).toUpperCase()}</span>
            <span>{new Date(order.created_at).toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">
              {order.status}
            </Badge>
            <Badge
              variant={order.payment_status === "released" || order.payment_status === "secured" ? "default" : "secondary"}
              className="text-[10px]"
            >
              {order.payment_status === "released" ? "Paid" :
               order.payment_status === "secured" ? "Secured" :
               order.payment_status ?? "Pending"}
            </Badge>
            {order.payment_method && (
              <Badge variant="outline" className="text-[10px] capitalize">
                {order.payment_method}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {item.quantity}× {item.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    @ {fmtPrice(item.unit_price, order.currency)}
                  </p>
                </div>
                <p className="text-xs font-semibold text-foreground shrink-0">
                  {fmtPrice(item.total_price ?? item.unit_price * item.quantity, order.currency)}
                </p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">{fmtPrice(order.subtotal, order.currency)}</span>
            </div>
            {fee > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-medium text-foreground">{fmtPrice(fee, order.currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-primary">{fmtPrice(order.total, order.currency)}</span>
            </div>
          </div>

          {order.notes && !order.notes.startsWith("idem:") && (
            <>
              <Separator />
              <p className="text-[10px] text-muted-foreground italic">
                Note: {order.notes}
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
