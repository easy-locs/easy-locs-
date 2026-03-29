import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, X, Send, CreditCard, FileText, MessageCircle, Mail, ShoppingCart } from "lucide-react";
import { generateInvoicePdf } from "./InvoicePdfGenerator";
import { uploadBookingDocumentFile, signBookingDocumentUrl } from "@/repositories/rental.repository";
import { sendCommunicationEvent, createDeepLinkMeta, type CommunicationEvent, type DeepLinkMeta } from "@/lib/shared";
import BookingStatusBadge from "./BookingStatusBadge";

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

/** Notification metadata for deep-linking — re-export from shared for backward compat */
export interface NotificationMeta {
  event_type: string;
  booking_id?: string;
  property_id?: string;
  country_code?: string;
  workspace_id?: string;
  target_type?: "marketplace_booking" | "concierge_order" | "booking_request" | "message" | "document" | "payment";
  service_title?: string;
}

/**
 * Build a deep-link URL — delegates to shared route builder
 */
function buildBookingDeepLink(meta: NotificationMeta): string {
  const targetType = meta.target_type || "marketplace_booking";
  const dlMeta = createDeepLinkMeta({
    targetType: targetType as any,
    targetId: meta.booking_id || "",
    module: "marketplace",
    countryCode: meta.country_code,
    bookingId: meta.booking_id,
  });
  return dlMeta.target_url;
}

/**
 * Legacy-compatible sync function — now delegates to the shared communication pipeline.
 */
async function syncToCommunicationCenter(opts: {
  orgId: string;
  userId?: string;
  email?: string;
  subject: string;
  message: string;
  category?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  meta?: NotificationMeta;
}) {
  const targetType = (opts.meta?.target_type || "marketplace_booking") as any;
  const meta = createDeepLinkMeta({
    targetType,
    targetId: opts.meta?.booking_id || "",
    module: "marketplace",
    countryCode: opts.meta?.country_code,
    bookingId: opts.meta?.booking_id,
    orgId: opts.orgId,
    propertyId: opts.meta?.property_id,
  });

  await sendCommunicationEvent({
    orgId: opts.orgId,
    senderId: opts.userId,
    recipientUserId: opts.userId,
    recipientEmail: opts.email,
    subject: opts.subject,
    message: opts.message,
    category: opts.category || "booking",
    meta,
    attachmentUrl: opts.attachmentUrl,
    attachmentName: opts.attachmentName,
  });
}

function sanitizeFileName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_\.]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export async function uploadBookingInvoiceAttachment(params: {
  blob: Blob;
  orgId: string;
  bookingId: string;
  invoiceNumber: string;
  customerName: string;
}) {
  const safeName = sanitizeFileName(params.customerName || "client");
  const fileName = `${sanitizeFileName(params.invoiceNumber)}-${safeName}.pdf`;
  const path = `${params.orgId}/invoices/${params.bookingId}/${crypto.randomUUID()}-${fileName}`;

  await uploadBookingDocumentFile(path, params.blob, "application/pdf");

  const signedUrl = await signBookingDocumentUrl(path);

  return {
    attachmentUrl: signedUrl || "",
    attachmentName: fileName,
  };

  return {
    attachmentUrl: signedData?.signedUrl || "",
    attachmentName: fileName,
  };
}

async function handleInvoice(booking: any, service: any, provider: any) {
  const blob = await generateInvoicePdf({ booking, service, provider });
  if (!blob) return;

  const invoiceNum = `${provider.invoice_prefix || "INV"}-${String(provider.invoice_next_number || 1).padStart(4, "0")}`;
  const taxRate = Number(provider.tax_rate || 0);
  const taxAmount = taxRate > 0 ? Math.round(Number(booking.total_price) * taxRate) / 100 : 0;
  const grandTotal = Number(booking.total_price) + taxAmount;

  let attachmentUrl: string | undefined;
  let attachmentName: string | undefined;

  try {
    const upload = await uploadBookingInvoiceAttachment({
      blob,
      orgId: booking.org_id || provider.org_id,
      bookingId: booking.id,
      invoiceNumber: invoiceNum,
      customerName: booking.booker_name,
    });
    attachmentUrl = upload.attachmentUrl;
    attachmentName = upload.attachmentName;
  } catch (error) {
    console.error("Invoice attachment upload error:", error);
  }

  await syncToCommunicationCenter({
    orgId: booking.org_id || provider.org_id,
    userId: provider.user_id,
    email: booking.booker_email,
    subject: `📄 Invoice ${invoiceNum}: ${service?.title || "Service"}`,
    message: `Invoice ${invoiceNum} generated for ${booking.booker_name}.\nService: ${service?.title}\nSubtotal: ${Number(booking.total_price).toLocaleString()} ${booking.currency}${taxRate > 0 ? `\n${provider.tax_label || "VAT"} (${taxRate}%): ${taxAmount.toLocaleString()} ${booking.currency}` : ""}\nTotal: ${grandTotal.toLocaleString()} ${booking.currency}\n\n${provider.invoice_company_name || provider.display_name || ""}`,
    category: "payment",
    attachmentUrl,
    attachmentName,
    meta: {
      event_type: "invoice_generated",
      booking_id: booking.id,
      property_id: booking.property_id,
      country_code: service?.country || provider?.country || "",
      workspace_id: booking.org_id || provider.org_id,
      target_type: "marketplace_booking",
      service_title: service?.title,
    },
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

function shareInvoiceEmail(booking: any, service: any, provider: any) {
  const invoiceNum = `${provider?.invoice_prefix || "INV"}-${String(provider?.invoice_next_number || 1).padStart(4, "0")}`;
  const taxRate = Number(provider?.tax_rate || 0);
  const taxAmount = taxRate > 0 ? Math.round(Number(booking.total_price) * taxRate) / 100 : 0;
  const grandTotal = Number(booking.total_price) + taxAmount;
  const subject = `Invoice ${invoiceNum} — ${service?.title || "Service"}`;
  const body = `Dear ${booking.booker_name},\n\nPlease find below the details of your invoice:\n\nInvoice: ${invoiceNum}\nService: ${service?.title || "Service"}\nAmount: ${grandTotal.toLocaleString()} ${booking.currency}${taxRate > 0 ? ` (incl. ${provider.tax_label || "VAT"} ${taxRate}%)` : ""}\n\nThank you for your business.\n\n${provider?.invoice_company_name || provider?.display_name || "Easy-Locs®"}`;
  window.open(`mailto:${booking.booker_email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_self");
}

export default function BookingsManager({ bookings, services, provider, onUpdateStatus, onSendPaymentLink, onConfirmPayment }: Props) {
  const getService = (id: string) => services.find((s) => s.id === id);

  if (bookings.length === 0) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground font-medium">No bookings yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Bookings will appear here when customers reserve your services</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => {
        const svc = getService(b.service_id);

        return (
          <Card key={b.id} className="border-border/60 hover:border-accent/30 transition-colors">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{b.booker_name}</p>
                    <BookingStatusBadge status={b.status || "pending"} />
                    {b.payment_confirmed && (
                      <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {svc?.title || "Service"} — {b.service_date} {b.service_time && `at ${b.service_time}`}
                    {b.date_from && b.date_to && ` (${b.date_from} → ${b.date_to})`}
                  </p>
                  <p className="text-xs text-muted-foreground">{b.booker_email} {b.booker_phone && `• ${b.booker_phone}`}</p>
                  {b.notes && <p className="text-xs text-muted-foreground/80 italic border-l-2 border-accent/20 pl-2">"{b.notes}"</p>}
                </div>

                <div className="flex flex-col items-end gap-2.5 shrink-0">
                  <span className="text-lg font-bold text-foreground tabular-nums">{Number(b.total_price).toLocaleString()} {b.currency}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {b.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => onUpdateStatus(b.id, "confirmed")} className="shadow-sm">
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
                        <Button size="sm" onClick={() => onUpdateStatus(b.id, "completed")} className="shadow-sm">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                        </Button>
                      </>
                    )}
                    {(b.status === "confirmed" || b.status === "completed" || b.payment_confirmed) && provider?.invoicing_enabled && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleInvoice(b, svc, provider)}>
                          <FileText className="h-3 w-3 mr-1" /> Invoice
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => shareInvoiceEmail(b, svc, provider)} title="Email">
                          <Mail className="h-3 w-3" />
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

export { syncToCommunicationCenter, buildBookingDeepLink };
