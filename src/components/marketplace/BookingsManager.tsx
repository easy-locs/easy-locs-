import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, X, Send, CreditCard, FileText, Share2, MessageCircle } from "lucide-react";
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

/**
 * Log an action to communication center + notification + email
 */
async function syncToCommunicationCenter(opts: {
  orgId: string;
  userId?: string;
  email?: string;
  subject: string;
  message: string;
  category?: string;
}) {
  // 1. Create message thread in communication center
  try {
    await supabase.from("messages").insert({
      org_id: opts.orgId,
      sender_id: opts.userId || null,
      content: opts.message,
      category: opts.category || "general",
      read: false,
    } as any);
  } catch (e) { console.error("Comms center sync error:", e); }

  // 2. Create in-app notification
  if (opts.userId) {
    try {
      await supabase.from("notifications").insert({
        user_id: opts.userId,
        org_id: opts.orgId,
        type: "info",
        title: opts.subject,
        message: opts.message.slice(0, 200),
        link: "/dashboard/activities",
      });
    } catch (e) { console.error("Notification sync error:", e); }
  }

  // 3. Send email
  if (opts.email) {
    try {
      await supabase.functions.invoke("send-notification-email", {
        body: { to: opts.email, subject: opts.subject, message: opts.message },
      });
    } catch (e) { console.error("Email sync error:", e); }
  }
}

async function handleInvoice(booking: any, service: any, provider: any) {
  const blob = await generateInvoicePdf({ booking, service, provider });
  if (!blob) return;

  const invoiceNum = `${provider.invoice_prefix || "INV"}-${String(provider.invoice_next_number || 1).padStart(4, "0")}`;
  const taxRate = Number(provider.tax_rate || 0);
  const taxAmount = taxRate > 0 ? Math.round(Number(booking.total_price) * taxRate) / 100 : 0;
  const grandTotal = Number(booking.total_price) + taxAmount;

  // Sync invoice to all channels
  await syncToCommunicationCenter({
    orgId: booking.org_id || provider.org_id,
    userId: provider.user_id,
    email: booking.booker_email,
    subject: `📄 Invoice ${invoiceNum}: ${service?.title || "Service"}`,
    message: `Invoice ${invoiceNum} generated for ${booking.booker_name}.\nService: ${service?.title}\nSubtotal: ${Number(booking.total_price).toLocaleString()} ${booking.currency}${taxRate > 0 ? `\n${provider.tax_label || "VAT"} (${taxRate}%): ${taxAmount.toLocaleString()} ${booking.currency}` : ""}\nTotal: ${grandTotal.toLocaleString()} ${booking.currency}\n\n${provider.invoice_company_name || provider.display_name || ""}`,
    category: "payment",
  });
}

function shareInvoiceWhatsApp(booking: any, service: any, provider: any) {
  const invoiceNum = `${provider?.invoice_prefix || "INV"}-${String(provider?.invoice_next_number || 1).padStart(4, "0")}`;
  const taxRate = Number(provider?.tax_rate || 0);
  const taxAmount = taxRate > 0 ? Math.round(Number(booking.total_price) * taxRate) / 100 : 0;
  const grandTotal = Number(booking.total_price) + taxAmount;
  const text = `📄 Invoice ${invoiceNum}\nService: ${service?.title || "Service"}\nAmount: ${grandTotal.toLocaleString()} ${booking.currency}${taxRate > 0 ? ` (incl. ${provider.tax_label || "VAT"} ${taxRate}%)` : ""}\nClient: ${booking.booker_name}\n— ${provider?.invoice_company_name || provider?.display_name || "Easy-Locs®"}`;
  const phone = booking.booker_phone?.replace(/[^0-9+]/g, "") || "";
  const url = phone
    ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function shareInvoiceTelegram(booking: any, service: any, provider: any) {
  const invoiceNum = `${provider?.invoice_prefix || "INV"}-${String(provider?.invoice_next_number || 1).padStart(4, "0")}`;
  const taxRate = Number(provider?.tax_rate || 0);
  const taxAmount = taxRate > 0 ? Math.round(Number(booking.total_price) * taxRate) / 100 : 0;
  const grandTotal = Number(booking.total_price) + taxAmount;
  const text = `📄 Invoice ${invoiceNum}\nService: ${service?.title || "Service"}\nAmount: ${grandTotal.toLocaleString()} ${booking.currency}\nClient: ${booking.booker_name}`;
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
                          <Send className="h-3 w-3 mr-1" /> Payment
                        </Button>
                        {!b.payment_confirmed && (
                          <Button size="sm" variant="outline" onClick={() => onConfirmPayment(b.id)}>
                            <CreditCard className="h-3 w-3 mr-1" /> Confirm Pay
                          </Button>
                        )}
                        <Button size="sm" onClick={() => onUpdateStatus(b.id, "completed")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                        </Button>
                      </>
                    )}
                    {/* Invoice + Share */}
                    {(b.status === "confirmed" || b.status === "completed" || b.payment_confirmed) && provider?.invoicing_enabled && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleInvoice(b, svc, provider)}>
                          <FileText className="h-3 w-3 mr-1" /> Invoice
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => shareInvoiceWhatsApp(b, svc, provider)} title="WhatsApp">
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => shareInvoiceTelegram(b, svc, provider)} title="Telegram">
                          <Send className="h-3 w-3" />
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

export { syncToCommunicationCenter };
