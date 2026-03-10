import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Search, Filter } from "lucide-react";
import BookingStatusBadge, { BOOKING_STATUSES, type BookingStatus } from "./BookingStatusBadge";
import BookingDetailDrawer from "./BookingDetailDrawer";
import { generateInvoicePdf } from "./InvoicePdfGenerator";
import { syncToCommunicationCenter, uploadBookingInvoiceAttachment } from "./BookingsManager";
import { format } from "date-fns";
import { useOrgRole } from "@/hooks/useOrgRole";

interface Props {
  bookings: any[];
  services: any[];
  provider?: any;
  orgId: string;
  onUpdateStatus: (id: string, status: string) => void;
  onSendPaymentLink: (booking: any) => void;
  onConfirmPayment: (id: string) => void;
  onModifyBooking?: (booking: any, changes: any) => Promise<boolean>;
  onSendQuote?: (booking: any, data: { quoted_price: number; quote_message: string }) => Promise<boolean>;
  focusBookingId?: string | null;
}

export default function BookingRequestCenter({
  bookings, services, provider, orgId,
  onUpdateStatus, onSendPaymentLink, onConfirmPayment,
  onModifyBooking, onSendQuote,
  focusBookingId,
}: Props) {
  const { can } = useOrgRole();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastAppliedId, setLastAppliedId] = useState<string | null>(null);

  // Deep-link: auto-open booking detail when focusBookingId changes (reactive, not one-shot)
  useEffect(() => {
    if (!focusBookingId || focusBookingId === lastAppliedId) return;
    if (bookings.length === 0) return;
    const found = bookings.find((b) => String(b.id) === String(focusBookingId));
    if (found) {
      setSelectedBooking(found);
      setLastAppliedId(focusBookingId);
      console.log("[deep-link] auto-opened marketplace booking detail:", focusBookingId);
    } else {
      // Booking not found — still mark as applied to avoid looping
      setLastAppliedId(focusBookingId);
      console.warn("[deep-link] marketplace booking not found:", focusBookingId);
    }
  }, [focusBookingId, bookings, lastAppliedId]);

  const getService = (id: string) => services.find((s) => s.id === id);

  const filtered = useMemo(() => {
    let list = bookings;
    if (statusFilter !== "all") {
      list = list.filter((b) => b.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.booker_name?.toLowerCase().includes(q) ||
        b.booker_email?.toLowerCase().includes(q) ||
        getService(b.service_id)?.title?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookings, statusFilter, search]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: bookings.length };
    bookings.forEach((b) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });
    return counts;
  }, [bookings]);

  const handleInvoice = async (booking: any) => {
    const svc = getService(booking.service_id);
    const blob = await generateInvoicePdf({ booking, service: svc, provider });
    if (!blob) return;

    const invoiceNum = `${provider?.invoice_prefix || "INV"}-${String(provider?.invoice_next_number || 1).padStart(4, "0")}`;

    let attachmentUrl: string | undefined;
    let attachmentName: string | undefined;

    try {
      const upload = await uploadBookingInvoiceAttachment({
        blob,
        orgId: booking.org_id || orgId,
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
      orgId: booking.org_id || orgId,
      userId: provider?.user_id,
      email: booking.booker_email,
      subject: `📄 Invoice ${invoiceNum}: ${svc?.title || "Service"}`,
      message: `Invoice generated for ${booking.booker_name}. Amount: ${Number(booking.total_price).toLocaleString()} ${booking.currency}`,
      category: "payment",
      attachmentUrl,
      attachmentName,
      meta: {
        event_type: "invoice_generated",
        booking_id: booking.id,
        country_code: svc?.country || "",
        workspace_id: booking.org_id || orgId,
        target_type: "marketplace_booking",
        service_title: svc?.title,
      },
    });
  };

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No bookings yet</p>
          <p className="text-xs text-muted-foreground mt-1">Bookings will appear here when customers reserve your services</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={statusFilter === "all" ? "default" : "outline"}
          onClick={() => setStatusFilter("all")}
          className="text-xs"
        >
          All ({statusCounts.all || 0})
        </Button>
        {Object.entries(BOOKING_STATUSES).map(([key, config]) => {
          const count = statusCounts[key] || 0;
          if (count === 0) return null;
          return (
            <Button
              key={key}
              size="sm"
              variant={statusFilter === key ? "default" : "outline"}
              onClick={() => setStatusFilter(key)}
              className="text-xs"
            >
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search by name, email, service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Booking list */}
      <div className="space-y-2">
        {filtered.map((b) => {
          const svc = getService(b.service_id);
          return (
            <Card
              key={b.id}
              className="cursor-pointer hover:border-accent/40 hover:shadow-card-hover transition-all"
              onClick={() => setSelectedBooking(b)}
            >
              <CardContent className="pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{b.booker_name}</p>
                      <BookingStatusBadge status={b.status} />
                      {b.payment_confirmed && (
                        <span className="text-xs text-accent font-medium">💰 Paid</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {svc?.title || "Service"} — {b.service_date || b.date_from || "—"}
                      {b.service_time && ` at ${b.service_time}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.booker_email} {b.booker_phone && `• ${b.booker_phone}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-lg font-bold text-foreground tabular-nums">
                      {Number(b.total_price).toLocaleString()} {b.currency}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(b.created_at), "dd/MM")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No bookings match your filters
        </div>
      )}

      {/* Detail Drawer */}
      <BookingDetailDrawer
        open={!!selectedBooking}
        onOpenChange={(v) => !v && setSelectedBooking(null)}
        booking={selectedBooking}
        service={selectedBooking ? getService(selectedBooking.service_id) : null}
        provider={provider}
        orgId={orgId}
        onUpdateStatus={can("bookings:write") ? (id, status) => { onUpdateStatus(id, status); setSelectedBooking(null); } : () => {}}
        onSendPaymentLink={can("bookings:write") ? (b) => { onSendPaymentLink(b); } : () => {}}
        onConfirmPayment={can("payments:write") ? (id) => { onConfirmPayment(id); setSelectedBooking(null); } : () => {}}
        onGenerateInvoice={can("bookings:manage") ? handleInvoice : undefined}
        onModifyBooking={can("bookings:manage") ? onModifyBooking : undefined}
        onSendQuote={can("bookings:manage") ? onSendQuote : undefined}
      />
    </div>
  );
}
