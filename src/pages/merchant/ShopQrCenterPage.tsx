/**
 * ShopQrCenterPage — Auto-generated QR codes for a shop.
 * Route: /merchant/qr/:shopId
 * Shows all QR types: order, payment, table, front desk, pickup, agent.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { loadShopContext, type ShopContext } from "@/lib/merchant/shop-os-engine";
import { encodeMerchantQr } from "@/lib/merchant-qr";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, Share2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ShopQrCenterPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();

  const { data: ctx, isLoading } = useQuery({
    queryKey: ["shop-qr-center", shopId],
    queryFn: () => loadShopContext(shopId!),
    enabled: !!shopId,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const shareQr = async (url: string, title: string) => {
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      copyToClipboard(url, title);
    }
  };

  if (isLoading) {
    return (
      <div className="app-mobile-page bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="app-mobile-page bg-background p-4">
        <MobilePageHeader title="QR Center" onBack={() => navigate(-1)} />
        <p className="text-sm text-muted-foreground mt-8 text-center">Shop not found</p>
      </div>
    );
  }

  const qrSections = [
    {
      title: "Order Page",
      description: "Customers scan to view menu & order online",
      qrValue: ctx.qrSet.order,
      type: "url" as const,
      color: "bg-primary/10 text-primary",
      useCases: ["Counter", "WhatsApp", "Instagram", "Flyer", "Table tent"],
    },
    {
      title: "Free Payment",
      description: "Customer enters the amount to pay",
      qrValue: ctx.qrSet.payFree,
      type: "qr" as const,
      color: "bg-emerald-500/10 text-emerald-400",
      useCases: ["Counter", "Reception", "Front desk"],
    },
    {
      title: "Front Desk",
      description: "Reception or counter payment",
      qrValue: ctx.qrSet.frontDesk,
      type: "qr" as const,
      color: "bg-violet-500/10 text-violet-400",
      useCases: ["Hotel", "Clinic", "Salon", "Cafe", "Pharmacy"],
    },
    {
      title: "Pickup",
      description: "Pickup validation QR",
      qrValue: ctx.qrSet.pickup,
      type: "qr" as const,
      color: "bg-cyan-500/10 text-cyan-400",
      useCases: ["Takeaway window", "Drive-through"],
    },
    {
      title: "Agent / Driver",
      description: "Share this link for driver collection",
      qrValue: ctx.qrSet.agent,
      type: "url" as const,
      color: "bg-orange-500/10 text-orange-400",
      useCases: ["Delivery", "Field collection"],
    },
  ];

  return (
    <div className="app-mobile-page bg-background pb-[calc(96px+env(safe-area-inset-bottom))]">
      <MobilePageHeader title={`QR Center — ${ctx.name}`} onBack={() => navigate(-1)} />

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Fixed amount QRs */}
        {ctx.qrSet.payFixed.length > 0 && (
          <div className="rounded-2xl border border-border/15 bg-card p-4 space-y-3">
            <p className="text-sm font-bold text-foreground">Fixed Amount Payments</p>
            <div className="grid grid-cols-2 gap-2">
              {ctx.qrSet.payFixed.map((qr, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/10"
                >
                  <QRCodeSVG value={encodeMerchantQr(qr)} size={80} level="M" />
                  <span className="text-sm font-bold text-foreground">{qr.amount} {qr.currency}</span>
                  <button
                    onClick={() => copyToClipboard(encodeMerchantQr(qr), `${qr.amount} ${qr.currency} QR`)}
                    className="text-[9px] text-primary font-medium flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table QRs */}
        {ctx.qrSet.table.length > 0 && (
          <div className="rounded-2xl border border-border/15 bg-card p-4 space-y-3">
            <p className="text-sm font-bold text-foreground">Table QR Codes</p>
            <div className="grid grid-cols-3 gap-2">
              {ctx.qrSet.table.map((qr, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-muted/50 border border-border/10"
                >
                  <QRCodeSVG value={encodeMerchantQr(qr)} size={60} level="M" />
                  <span className="text-[10px] font-bold text-foreground">{qr.tableCode}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other QR sections */}
        {qrSections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-border/15 bg-card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{section.title}</p>
                <p className="text-[10px] text-muted-foreground">{section.description}</p>
              </div>
              <span className={cn("text-[8px] font-bold px-2 py-0.5 rounded-full uppercase", section.color)}>
                {section.type === "url" ? "Link" : "QR"}
              </span>
            </div>

            <div className="flex justify-center py-2">
              <QRCodeSVG value={section.qrValue} size={140} level="M" />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(section.qrValue, section.title)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted text-xs font-medium text-foreground active:scale-95 transition-transform"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button
                onClick={() => shareQr(section.qrValue, section.title)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted text-xs font-medium text-foreground active:scale-95 transition-transform"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
              {section.type === "url" && (
                <button
                  onClick={() => window.open(section.qrValue, "_blank")}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-xs font-medium text-primary-foreground active:scale-95 transition-transform"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {section.useCases.map((uc) => (
                <span key={uc} className="text-[8px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {uc}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
