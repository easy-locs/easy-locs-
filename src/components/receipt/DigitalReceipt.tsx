/**
 * DigitalReceipt — Universal receipt/ticket component.
 * Supports ride, payment, delivery, order receipts.
 */
import { memo, useCallback, useRef } from "react";
import { Download, Share2, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

export interface ReceiptData {
  type: "ride" | "payment" | "delivery" | "order" | "rent";
  reference: string;
  date: string;
  amount: number;
  currency: string;
  status: "completed" | "pending" | "refunded";
  from?: string;
  to?: string;
  customerName?: string;
  providerName?: string;
  serviceTitle?: string;
  duration?: string;
  distance?: string;
  items?: Array<{ label: string; amount: number }>;
  platformFee?: number;
  tip?: number;
}

const TYPE_LABELS: Record<ReceiptData["type"], string> = {
  ride: "Ride Receipt",
  payment: "Payment Receipt",
  delivery: "Delivery Receipt",
  order: "Order Invoice",
  rent: "Rent Payment Receipt",
};

const TYPE_ICONS: Record<ReceiptData["type"], string> = {
  ride: "🚗",
  payment: "💳",
  delivery: "📦",
  order: "🛒",
  rent: "🏠",
};

const STATUS_STYLES: Record<ReceiptData["status"], string> = {
  completed: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-amber-500/10 text-amber-600",
  refunded: "bg-red-500/10 text-red-600",
};

function DigitalReceipt({ data, onClose }: { data: ReceiptData; onClose?: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleShare = useCallback(async () => {
    haptic("light");
    const text = `${TYPE_LABELS[data.type]}\nRef: ${data.reference}\nAmount: ${data.amount.toFixed(2)} ${data.currency}\nDate: ${data.date}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: TYPE_LABELS[data.type], text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Receipt copied to clipboard");
    }
  }, [data]);

  const handleDownload = useCallback(() => {
    haptic("light");
    const text = [
      `══════════════════════════`,
      `  ${TYPE_LABELS[data.type].toUpperCase()}`,
      `══════════════════════════`,
      `Reference: ${data.reference}`,
      `Date: ${data.date}`,
      `Status: ${data.status}`,
      "",
      data.from ? `From: ${data.from}` : null,
      data.to ? `To: ${data.to}` : null,
      data.distance ? `Distance: ${data.distance}` : null,
      data.duration ? `Duration: ${data.duration}` : null,
      data.customerName ? `Customer: ${data.customerName}` : null,
      data.providerName ? `Provider: ${data.providerName}` : null,
      data.serviceTitle ? `Service: ${data.serviceTitle}` : null,
      "",
      ...(data.items || []).map((i) => `  ${i.label}: ${i.amount.toFixed(2)} ${data.currency}`),
      data.platformFee ? `  Platform fee: ${data.platformFee.toFixed(2)} ${data.currency}` : null,
      data.tip ? `  Tip: ${data.tip.toFixed(2)} ${data.currency}` : null,
      `──────────────────────────`,
      `  TOTAL: ${data.amount.toFixed(2)} ${data.currency}`,
      `══════════════════════════`,
    ].filter(Boolean).join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${data.reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  }, [data]);

  return (
    <div className="bg-card rounded-2xl border border-border/20 shadow-xl overflow-hidden max-w-sm mx-auto">
      {/* Header */}
      <div className="bg-primary/5 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{TYPE_ICONS[data.type]}</span>
          <div>
            <h3 className="text-sm font-bold text-foreground">{TYPE_LABELS[data.type]}</h3>
            <p className="text-[10px] text-muted-foreground">#{data.reference}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[data.status]}`}>
            {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
          </span>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted/40 flex items-center justify-center">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div ref={receiptRef} className="px-5 py-4 space-y-3">
        {/* Amount */}
        <div className="text-center py-3">
          <p className="text-2xl font-bold text-foreground">
            {data.amount.toFixed(2)} <span className="text-base text-muted-foreground">{data.currency}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">{data.date}</p>
        </div>

        {/* Details grid */}
        <div className="space-y-2 text-xs">
          {data.from && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">From</span>
              <span className="text-foreground font-medium min-w-0 break-words max-w-[55%] text-right leading-snug">{data.from}</span>
            </div>
          )}
          {data.to && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">To</span>
              <span className="text-foreground font-medium min-w-0 break-words max-w-[55%] text-right leading-snug">{data.to}</span>
            </div>
          )}
          {data.distance && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance</span>
              <span className="text-foreground font-medium">{data.distance}</span>
            </div>
          )}
          {data.duration && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="text-foreground font-medium">{data.duration}</span>
            </div>
          )}
          {data.customerName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="text-foreground font-medium min-w-0 break-words max-w-[55%] text-right leading-snug">{data.customerName}</span>
            </div>
          )}
          {data.providerName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span className="text-foreground font-medium min-w-0 break-words max-w-[55%] text-right leading-snug">{data.providerName}</span>
            </div>
          )}
        </div>

        {/* Line items */}
        {data.items && data.items.length > 0 && (
          <div className="border-t border-border/10 pt-2 space-y-1.5">
            {data.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-muted-foreground min-w-0 break-words max-w-[60%] leading-snug">{item.label}</span>
                <span className="text-foreground font-medium">{item.amount.toFixed(2)}</span>
              </div>
            ))}
            {data.platformFee !== undefined && data.platformFee > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Platform fee</span>
                <span className="text-foreground font-medium">{data.platformFee.toFixed(2)}</span>
              </div>
            )}
            {data.tip !== undefined && data.tip > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tip</span>
                <span className="text-foreground font-medium">{data.tip.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-1 border-t border-border/10">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-primary">{data.amount.toFixed(2)} {data.currency}</span>
            </div>
          </div>
        )}

        {/* Verified badge */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[10px] text-muted-foreground">Verified transaction</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-10 rounded-xl text-xs font-medium active:scale-[0.97] transition-transform"
          onClick={handleShare}
        >
          <Share2 className="h-3.5 w-3.5 mr-1.5" />
          Share
        </Button>
        <Button
          size="sm"
          className="flex-1 h-10 rounded-xl text-xs font-medium active:scale-[0.97] transition-transform"
          onClick={handleDownload}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Download
        </Button>
      </div>
    </div>
  );
}

export default memo(DigitalReceipt);
