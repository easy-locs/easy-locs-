/**
 * BookingDetailDrawer — Full booking detail view with documents, payment, notes.
 * Shows everything about a booking in one place for fast verification.
 */

import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  uploadConciergeFile, updateConciergeOrderField,
  updateConciergeOrderStatus as repoUpdateStatus, markConciergeOrderPaid,
} from "@/repositories/concierge.repository";
import { toast } from "sonner";
import {
  User, Mail, Phone, Calendar, Clock, CreditCard, FileText, Upload,
  CheckCircle2, XCircle, MapPin, Building2, Eye, Trash2, Download,
  DollarSign, Send, Copy, ExternalLink, MessageCircle, Receipt
} from "lucide-react";
import { format } from "date-fns";
import BookingCommunicationThread from "@/components/marketplace/BookingCommunicationThread";
import { generateConciergeInvoice } from "./ConciergeInvoiceAdapter";
import BookingDocumentsPanel from "@/components/booking/BookingDocumentsPanel";

/** Format price using Intl based on currency code */
const fmtPrice = (amount: number, currency: string = "EUR") => {
  const cur = (currency || "EUR").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${cur}`;
  }
};

interface BookingDetailDrawerProps {
  booking: any;
  service: any;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  orgId: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-500/10 text-amber-600" },
  awaiting_payment: { label: "Awaiting Payment", cls: "bg-orange-500/10 text-orange-600" },
  paid: { label: "Paid", cls: "bg-emerald-500/10 text-emerald-600" },
  confirmed: { label: "Confirmed", cls: "bg-blue-500/10 text-blue-600" },
  in_progress: { label: "In Progress", cls: "bg-accent/10 text-accent-foreground" },
  completed: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-600" },
  cancelled: { label: "Cancelled", cls: "bg-destructive/10 text-destructive" },
  refunded: { label: "Refunded", cls: "bg-muted text-muted-foreground" },
};

export default function BookingDetailDrawer({ booking, service, open, onClose, onUpdate, orgId }: BookingDetailDrawerProps) {
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState(booking?.notes || "");
  const [saving, setSaving] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const documentUrls: string[] = Array.isArray(booking?.document_urls) ? booking.document_urls : [];
  const statusInfo = STATUS_MAP[booking?.status] || STATUS_MAP.pending;

  const handleDocUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !booking?.id) return;
    setUploading(true);

    try {
      const newUrls = [...documentUrls];
      for (const file of Array.from(files)) {
        const path = `concierge-docs/${orgId}/${booking.id}/${Date.now()}-${file.name}`;
        const url = await uploadConciergeFile("property-photos", path, file);
        newUrls.push(url);
      }

      await updateConciergeOrderField(booking.id, { document_urls: newUrls });
      toast.success(`${files.length} document(s) uploaded`);
      onUpdate();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }, [booking, documentUrls, orgId, onUpdate]);

  const removeDoc = useCallback(async (index: number) => {
    const updated = documentUrls.filter((_, i) => i !== index);
    await updateConciergeOrderField(booking.id, { document_urls: updated });
    toast.success("Document removed");
    onUpdate();
  }, [booking, documentUrls, onUpdate]);

  const saveNotes = useCallback(async () => {
    setSaving(true);
    await updateConciergeOrderField(booking.id, { notes });
    toast.success("Notes saved");
    setSaving(false);
  }, [booking, notes]);

  const updateStatus = useCallback(async (status: string) => {
    await repoUpdateStatus(booking.id, status);
    toast.success(`Booking ${status}`);
    onUpdate();
  }, [booking, onUpdate]);

  const markPaid = useCallback(async () => {
    await markConciergeOrderPaid(booking.id);
    toast.success("Payment confirmed");
    onUpdate();
  }, [booking, onUpdate]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const handleGenerateInvoice = useCallback(async () => {
    setGeneratingInvoice(true);
    try {
      await generateConciergeInvoice(booking, service, orgId);
    } catch (err: any) {
      toast.error("Invoice generation failed: " + err.message);
    } finally {
      setGeneratingInvoice(false);
    }
  }, [booking, service, orgId]);

  if (!booking) return null;

  const bankDetails = typeof service?.bank_details === "object" ? service.bank_details : {};

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Booking Details
          </SheetTitle>
        </SheetHeader>

        {/* Status badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
          <Badge className={statusInfo.cls}>{statusInfo.label}</Badge>
          <Badge variant="outline" className={booking.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}>
            {booking.payment_status === "paid" ? "💰 Paid" : "⏳ " + booking.payment_status}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="messages" className="text-xs">
              <MessageCircle className="h-3 w-3 mr-1" /> Chat
            </TabsTrigger>
            <TabsTrigger value="invoice" className="text-xs">
              <Receipt className="h-3 w-3 mr-1" /> Invoice
            </TabsTrigger>
          </TabsList>

          {/* ─── DETAILS TAB ─── */}
          <TabsContent value="details" className="space-y-5 mt-4">
          {/* Client Info */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</h3>
            <div className="bg-muted/30 rounded-[var(--card-radius)] p-3 space-y-1.5">
              <div className="flex items-start gap-2 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="font-medium text-foreground break-words">{booking.guest_name}</span>
              </div>
              <div className="flex items-start gap-2 text-sm min-w-0">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-foreground break-words min-w-0 flex-1">{booking.guest_email}</span>
                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0" onClick={() => copyToClipboard(booking.guest_email)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              {booking.guest_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">{booking.guest_phone}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => window.open(`mailto:${booking.guest_email}?subject=Booking ${service?.title || ""}`, "_blank")}>
                  <Mail className="h-3 w-3 mr-1" /> Email
                </Button>
                {booking.guest_phone && (
                  <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => window.open(`https://wa.me/${booking.guest_phone.replace(/[^0-9+]/g, "")}?text=${encodeURIComponent(`Hello ${booking.guest_name}, regarding your booking for ${service?.title || "our service"}...`)}`, "_blank")}>
                    <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                  </Button>
                )}
              </div>
            </div>
          </section>

          <Separator />

          {/* Service Info */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</h3>
            <div className="bg-muted/30 rounded-[var(--card-radius)] p-3 space-y-1.5">
              <p className="font-medium text-foreground text-sm">{service?.title || "Unknown service"}</p>
              {service?.category && <Badge variant="outline" className="text-[10px]">{service.category}</Badge>}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {booking.service_date && (
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{booking.service_date}</span>
                )}
                {booking.service_time && (
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{booking.service_time}</span>
                )}
                {booking.end_time && (
                  <span className="flex items-center gap-1">→ {booking.end_time}</span>
                )}
              </div>
              {service?.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />{service.location}
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Payment Info */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</h3>
            <div className="bg-muted/30 rounded-[var(--card-radius)] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-lg font-bold text-foreground">{fmtPrice(booking.total_price, booking.currency)}</span>
              </div>
              {booking.commission_amount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Commission</span>
                  <span className="text-foreground">{fmtPrice(booking.commission_amount, booking.currency)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Method</span>
                <span className="text-foreground capitalize">{booking.payment_method || "—"}</span>
              </div>
              {booking.bank_transfer_reference && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Transfer Ref</span>
                  <span className="text-foreground font-mono">{booking.bank_transfer_reference}</span>
                </div>
              )}
              {booking.payment_proof_url && (
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => window.open(booking.payment_proof_url, "_blank")}>
                  <Eye className="h-3 w-3 mr-1" /> View Payment Proof
                </Button>
              )}

              {booking.payment_method === "bank_transfer" && bankDetails.iban && (
                <div className="bg-background rounded-lg p-2 space-y-1 text-xs mt-2">
                  <p className="font-semibold text-foreground">Bank Details</p>
                  {bankDetails.bank_name && <p className="text-muted-foreground">Bank: {bankDetails.bank_name}</p>}
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">IBAN: </span>
                    <span className="font-mono text-foreground">{bankDetails.iban}</span>
                    <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={() => copyToClipboard(bankDetails.iban)}>
                      <Copy className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  {bankDetails.swift && <p className="text-muted-foreground">SWIFT: {bankDetails.swift}</p>}
                  {bankDetails.account_holder && <p className="text-muted-foreground">Holder: {bankDetails.account_holder}</p>}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {booking.payment_status !== "paid" && booking.status !== "cancelled" && (
                  <Button size="sm" className="flex-1 min-w-[9rem] text-xs" onClick={markPaid}>
                    <CreditCard className="h-3 w-3 mr-1" /> Mark Paid
                  </Button>
                )}
                {booking.payment_link_url && (
                  <Button size="sm" variant="outline" className="flex-1 min-w-[9rem] text-xs" onClick={() => copyToClipboard(booking.payment_link_url)}>
                    <Copy className="h-3 w-3 mr-1" /> Copy Payment Link
                  </Button>
                )}
              </div>
            </div>
          </section>

          <Separator />

          {/* Documents / ID Upload — shared component */}
          <BookingDocumentsPanel
            bookingId={booking.id}
            orgId={orgId}
            tableName="concierge_orders"
            documentUrls={documentUrls}
            onUpdate={onUpdate}
          />

          <Separator />

          {/* Notes */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this booking..."
              rows={3}
            />
            <Button size="sm" variant="outline" onClick={saveNotes} disabled={saving} className="text-xs">
              {saving ? "Saving..." : "Save Notes"}
            </Button>
          </section>

          <Separator />

          {/* Status Actions */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</h3>
            <div className="flex flex-wrap gap-2">
              {booking.status === "pending" && (
                <Button size="sm" onClick={() => updateStatus("confirmed")} className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Confirm
                </Button>
              )}
              {(booking.status === "confirmed" || booking.status === "in_progress") && (
                <Button size="sm" onClick={() => updateStatus("completed")} className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                </Button>
              )}
              {booking.status !== "cancelled" && booking.status !== "completed" && (
                <Button size="sm" variant="destructive" onClick={() => updateStatus("cancelled")} className="text-xs">
                  <XCircle className="h-3 w-3 mr-1" /> Cancel
                </Button>
              )}
            </div>
          </section>

          {/* Timestamps */}
          <div className="text-[10px] text-muted-foreground space-y-0.5 pt-2">
            <p>Created: {booking.created_at ? format(new Date(booking.created_at), "PPp") : "—"}</p>
            {booking.confirmed_at && <p>Confirmed: {format(new Date(booking.confirmed_at), "PPp")}</p>}
            {booking.completed_at && <p>Completed: {format(new Date(booking.completed_at), "PPp")}</p>}
            {booking.cancelled_at && <p>Cancelled: {format(new Date(booking.cancelled_at), "PPp")}</p>}
          </div>
          </TabsContent>

          {/* ─── MESSAGES TAB ─── */}
          <TabsContent value="messages" className="mt-4">
            <BookingCommunicationThread
              bookingId={booking.id}
              orgId={orgId}
              customerName={booking.guest_name || "Guest"}
              customerEmail={booking.guest_email}
            />
          </TabsContent>

          {/* ─── INVOICE TAB ─── */}
          <TabsContent value="invoice" className="mt-4 space-y-4">
            <div className="bg-muted/30 rounded-[var(--card-radius)] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-accent" />
                <h3 className="font-medium text-foreground">Generate Invoice</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Generate a professional PDF invoice for this booking. Requires a provider profile with invoicing enabled.
              </p>
              <div className="bg-background rounded-lg p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="text-foreground font-medium">{service?.title || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="text-foreground">{booking.guest_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="text-foreground font-bold">{fmtPrice(booking.total_price, booking.currency)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className={booking.payment_status === "paid" ? "text-emerald-600 font-medium" : "text-amber-600"}>{booking.payment_status === "paid" ? "✓ Paid" : "Pending"}</span></div>
              </div>
              <Button onClick={handleGenerateInvoice} disabled={generatingInvoice} className="w-full text-xs">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {generatingInvoice ? "Generating..." : "Download Invoice PDF"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
