import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, X, Send, CreditCard, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

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

function generateInvoicePdf(booking: any, service: any, provider: any) {
  if (!provider?.invoicing_enabled) {
    toast.error("Invoicing is not enabled. Activate it in your provider profile.");
    return;
  }

  const doc = new jsPDF();
  const margin = 20;
  let y = margin;

  // Header
  const companyName = provider.invoice_company_name || provider.company_name || provider.display_name || "Provider";
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, margin, y);
  y += 8;

  if (provider.invoice_address) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = provider.invoice_address.split("\n");
    lines.forEach((line: string) => {
      doc.text(line, margin, y);
      y += 4;
    });
  }

  if (provider.invoice_tax_id) {
    doc.setFontSize(9);
    doc.text(`Tax ID: ${provider.invoice_tax_id}`, margin, y);
    y += 4;
  }

  if (provider.email) {
    doc.text(`Email: ${provider.email}`, margin, y);
    y += 4;
  }
  if (provider.phone) {
    doc.text(`Phone: ${provider.phone}`, margin, y);
    y += 4;
  }

  y += 6;

  // Invoice number & date
  const prefix = provider.invoice_prefix || "INV";
  const num = String(provider.invoice_next_number || 1).padStart(4, "0");
  const invoiceNumber = `${prefix}-${num}`;
  const invoiceDate = new Date().toLocaleDateString("en-GB");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`INVOICE ${invoiceNumber}`, margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${invoiceDate}`, margin, y);
  y += 10;

  // Client info
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(booking.booker_name || "Client", margin, y);
  y += 5;
  doc.text(booking.booker_email || "", margin, y);
  y += 5;
  if (booking.booker_phone) {
    doc.text(booking.booker_phone, margin, y);
    y += 5;
  }

  y += 10;

  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, 190, y);
  y += 6;

  // Table header
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Description", margin, y);
  doc.text("Qty", 120, y, { align: "center" });
  doc.text("Unit Price", 145, y, { align: "center" });
  doc.text("Total", 180, y, { align: "right" });
  y += 3;
  doc.line(margin, y, 190, y);
  y += 6;

  // Item
  const title = service?.title || "Service";
  const dateInfo = booking.date_from && booking.date_to
    ? `${booking.date_from} → ${booking.date_to}`
    : booking.service_date || "";
  const qty = booking.quantity || 1;
  const unitPrice = service?.price || Number(booking.total_price || 0) / qty;
  const totalPrice = Number(booking.total_price || 0);
  const currency = booking.currency || "EUR";

  doc.setFont("helvetica", "normal");
  doc.text(title, margin, y);
  y += 4;
  if (dateInfo) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(dateInfo, margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    y += 4;
  }

  // Values on same line as title
  const valueY = dateInfo ? y - 8 : y;
  doc.text(String(qty), 120, valueY, { align: "center" });
  doc.text(`${unitPrice.toLocaleString()} ${currency}`, 145, valueY, { align: "center" });
  doc.text(`${totalPrice.toLocaleString()} ${currency}`, 180, valueY, { align: "right" });

  y += 6;
  doc.line(margin, y, 190, y);
  y += 8;

  // Total
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", 140, y);
  doc.text(`${totalPrice.toLocaleString()} ${currency}`, 180, y, { align: "right" });
  y += 10;

  // Payment status
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const paymentStatus = booking.payment_confirmed ? "✅ PAID" : "⏳ PENDING";
  doc.text(`Payment Status: ${paymentStatus}`, margin, y);
  y += 5;
  if (booking.payment_confirmed_at) {
    doc.text(`Paid on: ${new Date(booking.payment_confirmed_at).toLocaleDateString("en-GB")}`, margin, y);
    y += 5;
  }

  // Notes
  if (booking.notes) {
    y += 5;
    doc.setFontSize(9);
    doc.text(`Notes: ${booking.notes}`, margin, y);
  }

  // Footer
  y = 270;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated by Easy-Locs® — ${invoiceNumber}`, margin, y);

  doc.save(`${invoiceNumber}-${booking.booker_name?.replace(/\s+/g, "-") || "invoice"}.pdf`);
  toast.success(`Invoice ${invoiceNumber} generated!`);
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
                    {/* Invoice button for confirmed/completed/paid */}
                    {(b.status === "confirmed" || b.status === "completed" || b.payment_confirmed) && provider?.invoicing_enabled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateInvoicePdf(b, svc, provider)}
                      >
                        <FileText className="h-3 w-3 mr-1" /> Invoice
                      </Button>
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
