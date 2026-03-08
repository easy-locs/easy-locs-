import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, X, Send, CreditCard, FileText, Share2 } from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePdf } from "./InvoicePdfGenerator";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  bookings: any[];
  services: any[];
  provider?: any;
  onUpdateStatus: (id: string, status: string) => void;
  onSendPaymentLink: (booking: any) => void;
  onConfirmPayment: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any }> = {
  pending: { label: "Pending", variant: "outline", icon: Clock },
  confirmed: { label: "Confirmed", variant: "secondary", icon: CheckCircle2 },
  completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive", icon: X },
};

async function handleInvoice(booking: any, service: any, provider: any) {
  const blob = await generateInvoicePdf({ booking, service, provider });
  if (!blob) return;

  // Auto-email invoice if invoicing enabled
  if (provider?.invoicing_enabled && booking.booker_email) {
    try {
      await supabase.functions.invoke("send-notification-email", {
        body: {
          to: booking.booker_email,
          subject: `Invoice for ${service?.title || "Service"} — ${provider.invoice_prefix || "INV"}-${String(provider.invoice_next_number || 1).padStart(4, "0")}`,
          message: `Hello ${booking.booker_name},\n\nPlease find your invoice for "${service?.title || "Service"}".\nAmount: ${booking.total_price} ${booking.currency}\n\nThank you!\n${provider.invoice_company_name || provider.display_name || ""}`,
        },
      });
      toast.success("Invoice sent by email!");
    } catch (e) {
      console.error("Invoice email error:", e);
    }
  }
}

function shareInvoiceWhatsApp(booking: any, service: any, provider: any) {
  const invoiceNum = `${provider?.invoice_prefix || "INV"}-${String(provider?.invoice_next_number || 1).padStart(4, "0")}`;
  const text = `📄 Invoice ${invoiceNum}\nService: ${service?.title || "Service"}\nAmount: ${booking.total_price} ${booking.currency}\nClient: ${booking.booker_name}\n— ${provider?.invoice_company_name || provider?.display_name || "Easy-Locs®"}`;
  const phone = booking.booker_phone?.replace(/[^0-9+]/g, "") || "";
  const url = phone
    ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function shareInvoiceTelegram(booking: any, service: any, provider: any) {
  const invoiceNum = `${provider?.invoice_prefix || "INV"}-${String(provider?.invoice_next_number || 1).padStart(4, "0")}`;
  const text = `📄 Invoice ${invoiceNum}\nService: ${service?.title || "Service"}\nAmount: ${booking.total_price} ${booking.currency}\nClient: ${booking.booker_name}`;
  window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(text)}`, "_blank");
}

export default function BookingsManager({ bookings, services, provider, onUpdateStatus, onSendPaymentLink, onConfirmPayment }: Props) {
  const getService = (id: string) => services.find((s) => s.id === id);

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No bookings yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => {
        const svc = getService(b.service_id);
        const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
        const StatusIcon = sc.icon;

        return (
          <Card key={b.id}>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{b.booker_name}</p>
                    <Badge variant={sc.variant}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {sc.label}
                    </Badge>
                    {b.payment_confirmed && <Badge variant="default">💰 Paid</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {svc?.title || "Service"} — {b.service_date} {b.service_time && `at ${b.service_time}`}
                    {b.date_from && b.date_to && ` (${b.date_from} → ${b.date_to})`}
                  </p>
                  <p className="text-xs text-muted-foreground">{b.booker_email} {b.booker_phone && `• ${b.booker_phone}`}</p>
                  {b.notes && <p className="text-xs text-muted-foreground italic">"{b.notes}"</p>}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-lg font-bold text-foreground">{Number(b.total_price).toLocaleString()} {b.currency}</span>
                  <div className="flex flex-wrap gap-1">
                    {b.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => onUpdateStatus(b.id, "confirmed")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Confirm
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onUpdateStatus(b.id, "cancelled")}>
                          <X className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {b.status === "confirmed" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => onSendPaymentLink(b)}>
                          <Send className="h-3 w-3 mr-1" /> Send Payment
                        </Button>
                        {!b.payment_confirmed && (
                          <Button size="sm" variant="outline" onClick={() => onConfirmPayment(b.id)}>
                            <CreditCard className="h-3 w-3 mr-1" /> Confirm Payment
                          </Button>
                        )}
                        <Button size="sm" onClick={() => onUpdateStatus(b.id, "completed")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                        </Button>
                      </>
                    )}
                    {/* Invoice buttons */}
                    {(b.status === "confirmed" || b.status === "completed" || b.payment_confirmed) && provider?.invoicing_enabled && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleInvoice(b, svc, provider)}>
                          <FileText className="h-3 w-3 mr-1" /> Invoice
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => shareInvoiceWhatsApp(b, svc, provider)} title="Share via WhatsApp">
                          <Share2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
