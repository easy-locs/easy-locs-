import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Mail, MapPin, Users, Clock, Upload } from "lucide-react";
import PaymentMethodSelector, { type PaymentMethod } from "./PaymentMethodSelector";
import MarketplaceDisclaimer from "./MarketplaceDisclaimer";
import { format } from "date-fns";
import { fetchBookedDates } from "@/repositories/marketplace.repository";
import { toast } from "sonner";
import ServiceBookingCalendar, { type ActivityBookingRules } from "@/components/concierge/ServiceBookingCalendar";
import { getCategoryBookingConfig } from "./CategoryBookingConfig";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  service: any;
  provider: any;
  onSubmit: (data: {
    booker_name: string;
    booker_email: string;
    booker_phone: string;
    service_date: string;
    service_time: string;
    date_from?: string;
    date_to?: string;
    quantity: number;
    notes: string;
    pickup_location?: string;
    dropoff_location?: string;
    passengers?: number;
    return_time?: string;
  }) => void;
  isPending?: boolean;
}

function deriveBookingRules(service: any): ActivityBookingRules {
  if (!service) return {};
  return {
    durationMinutes: service.duration_minutes || undefined,
    maxCapacity: service.max_capacity || undefined,
    slotInterval: service.slot_interval || undefined,
    minNoticeHours: service.min_notice_hours || undefined,
    maxAdvanceDays: service.max_advance_days || undefined,
    availableDays: Array.isArray(service.available_days) ? service.available_days : undefined,
    openHour: service.open_hour || undefined,
    closeHour: service.close_hour || undefined,
    mode: service.price_type === "daily" ? "daily" : "hourly",
  };
}

export default function BookingDialog({ open, onOpenChange, service, provider, onSubmit, isPending }: Props) {
  const { t } = useI18n();
  const config = useMemo(() => getCategoryBookingConfig(service?.category || "other"), [service?.category]);
  const isRange = config.calendarMode === "range";
  const rules = useMemo(() => deriveBookingRules(service), [service]);

  const [form, setForm] = useState({
    booker_name: "",
    booker_email: "",
    booker_phone: "",
    service_date: format(new Date(), "yyyy-MM-dd"),
    service_time: "",
    date_from: "",
    date_to: "",
    quantity: 1,
    notes: "",
    pickup_location: "",
    dropoff_location: "",
    passengers: 1,
    return_time: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null);
  const [idDocUploading, setIdDocUploading] = useState(false);
  const [bookedDates, setBookedDates] = useState<{ from: string; to: string }[]>([]);

  useEffect(() => {
    if (!open || !service?.id) return;
    const loadBookings = async () => {
      const data = await fetchBookedDates(service.id);
      setBookedDates(data.map((b: any) => ({
        from: b.date_from || b.service_date,
        to: b.date_to || b.service_date,
      })).filter((b: any) => b.from));
    };
    loadBookings();
  }, [open, service?.id]);

  const update = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const days = useMemo(() => {
    if (!isRange || !form.date_from || !form.date_to) return 0;
    return Math.max(1, Math.ceil((new Date(form.date_to).getTime() - new Date(form.date_from).getTime()) / 86400000));
  }, [isRange, form.date_from, form.date_to]);

  const totalPrice = useMemo(() => {
    const price = Number(service?.price || 0);
    if (isRange) return price * days;
    const qty = form.quantity || 1;
    return price * qty;
  }, [isRange, days, form.quantity, service?.price]);

  const dateOverlap = useMemo(() => {
    if (!isRange || !form.date_from || !form.date_to) return false;
    return bookedDates.some(b => form.date_from < b.to && form.date_to > b.from);
  }, [isRange, form.date_from, form.date_to, bookedDates]);

  const paymentStripe = service?.payment_stripe_link || provider?.payment_stripe_link;
  const paymentPaypal = service?.payment_paypal_email || provider?.payment_paypal_email;
  const paymentCustom = service?.payment_custom_url || provider?.payment_custom_url;

  const timeSlots = Array.isArray(service?.time_slots) ? service.time_slots : [];
  const blockedDates2 = Array.isArray(service?.blocked_dates) ? service.blocked_dates : [];

  const handleRangeSelect = (from: Date, to: Date) => {
    setForm(f => ({
      ...f,
      date_from: format(from, "yyyy-MM-dd"),
      date_to: format(to, "yyyy-MM-dd"),
      service_date: format(from, "yyyy-MM-dd"),
    }));
  };

  const handleSingleSelect = (dateVal: Date, time: string) => {
    setForm(f => ({
      ...f,
      service_date: format(dateVal, "yyyy-MM-dd"),
      service_time: time || f.service_time,
    }));
  };

  const needsDoc = !!service?.requires_id_document;
  const isValid = form.booker_name && form.booker_email && !dateOverlap &&
    (isRange ? (form.date_from && form.date_to) : !!form.service_date) &&
    (!needsDoc || !!idDocUrl);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] max-h-[85vh] p-0 overflow-hidden flex flex-col rounded-2xl">
        <DialogHeader className="px-4 pt-4 pb-2.5 shrink-0 border-b border-border/50">
          <DialogTitle className="text-base font-semibold min-w-0 break-words leading-snug">{t("mp.book") || "Book"}: {service?.title}</DialogTitle>
        </DialogHeader>

        {service && (
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3.5 overscroll-contain">
            {/* Service info */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="font-medium text-foreground text-sm min-w-0 break-words leading-snug">{service.title}</p>
              <p className="text-xs text-muted-foreground min-w-0 break-words leading-snug">
                {provider?.display_name} — {service.city}, {service.country}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-accent">
                  {Number(service.price).toLocaleString()} {service.currency}
                </span>
                {config.priceUnit && <span className="text-xs text-muted-foreground">{config.priceUnit}</span>}
                {service.duration_minutes && config.showDuration && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5 ms-auto">
                    <Clock className="h-3 w-3" /> {service.duration_minutes} min
                  </span>
                )}
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-2">
              <div>
                <Label className="text-xs">{t("mp.full_name") || "Full Name"} *</Label>
                <Input className="h-9 text-sm" value={form.booker_name} onChange={(e) => update("booker_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{t("mp.your_email") || "Email"} *</Label>
                <Input className="h-9 text-sm" type="email" value={form.booker_email} onChange={(e) => update("booker_email", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{t("mp.your_phone") || "Phone"}</Label>
                  <Input className="h-9 text-sm" value={form.booker_phone} onChange={(e) => update("booker_phone", e.target.value)} />
                </div>
                {config.showQuantity && (
                  <div>
                    <Label className="text-xs">{t("mp.quantity") || config.quantityLabel || "Quantity"}</Label>
                    <Input className="h-9 text-sm" type="number" min={1} value={form.quantity || ""} onChange={(e) => update("quantity", e.target.value === "" ? 0 : Number(e.target.value))} placeholder="1" />
                  </div>
                )}
              </div>
            </div>

            {/* ID Document upload */}
            {needsDoc && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Upload className="h-3 w-3" /> 🪪 {t("mp.id_document_required") || "ID Document Required"} *
                </Label>
                <p className="text-[11px] text-muted-foreground">{t("mp.id_document_desc") || "This service requires a copy of your identity document (passport, ID card, or driver's license)."}</p>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  className="h-9 text-sm cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) { toast.error(t("mp.file_too_large") || "File too large (max 10MB)"); return; }
                    setIdDocUploading(true);
                    try {
                      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
                      const path = `${service.org_id}/id-docs/${crypto.randomUUID()}.${ext}`;
                      const { uploadBookingDocument } = await import("@/repositories/marketplace.repository");
                      await uploadBookingDocument("booking-documents", path, file);
                      setIdDocUrl(path);
                      toast.success(t("mp.document_uploaded") || "ID document uploaded");
                    } finally { setIdDocUploading(false); }
                  }}
                />
                {idDocUploading && <p className="text-xs text-muted-foreground">{t("mp.uploading") || "Uploading..."}</p>}
                {idDocUrl && !idDocUploading && <p className="text-xs text-accent">✓ {t("mp.document_uploaded") || "Document uploaded"}</p>}
              </div>
            )}

            {/* Passengers */}
            {config.showPassengers && (
              <div>
                <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> {t("mp.passengers") || "Passengers"}</Label>
                <Input className="h-9 text-sm" type="number" min={1} value={form.passengers || ""} onChange={(e) => update("passengers", e.target.value === "" ? 0 : Number(e.target.value))} placeholder="1" />
              </div>
            )}

            {/* Pickup / Drop-off locations */}
            {config.showLocations && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> {t("mp.pickup_location") || "Pickup Location"}</Label>
                  <Input className="h-9 text-sm" value={form.pickup_location} onChange={(e) => update("pickup_location", e.target.value)} placeholder={t("mp.pickup_placeholder") || "Airport, hotel..."} />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> {t("mp.dropoff_location") || "Drop-off Location"}</Label>
                  <Input className="h-9 text-sm" value={form.dropoff_location} onChange={(e) => update("dropoff_location", e.target.value)} placeholder={t("mp.dropoff_placeholder") || "Destination..."} />
                </div>
              </div>
            )}

            {/* Time pickers */}
            {isRange && config.showTime && (
              <div className={`grid gap-2 ${config.showReturnTime ? "grid-cols-1 sm:grid-cols-2" : ""}`}>
                <div>
                  <Label className="text-xs">{t("mp.pickup_time") || "Pickup Time"}</Label>
                  <Input className="h-9 text-sm" type="time" value={form.service_time} onChange={(e) => update("service_time", e.target.value)} />
                </div>
                {config.showReturnTime && (
                  <div>
                    <Label className="text-xs">{t("mp.return_time") || "Return Time"}</Label>
                    <Input className="h-9 text-sm" type="time" value={form.return_time} onChange={(e) => update("return_time", e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {/* Calendar */}
            <div className="border border-border rounded-lg p-2 overflow-hidden">
              <div className="flex justify-center [&_.rdp]:text-xs [&_.rdp-day]:h-8 [&_.rdp-day]:w-8 [&_.rdp-head_cell]:text-xs [&_.rdp-caption]:text-sm [&_.rdp-table]:w-full [&_.rdp]:max-w-full">
                <ServiceBookingCalendar
                  serviceId={service.id}
                  timeSlots={timeSlots}
                  blockedDates={blockedDates2}
                  maxCapacity={service.max_capacity}
                  rangeMode={isRange}
                  onSelect={handleSingleSelect}
                  onSelectRange={handleRangeSelect}
                  selectedDate={!isRange && form.service_date ? new Date(form.service_date) : undefined}
                  selectedTime={form.service_time}
                  selectedRange={
                    isRange && form.date_from && form.date_to
                      ? { from: new Date(form.date_from), to: new Date(form.date_to) }
                      : null
                  }
                  rules={rules}
                  checkInLabel={config.dateLabel}
                  checkOutLabel={config.endDateLabel}
                />
              </div>
            </div>

            {dateOverlap && (
              <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">⚠️ {t("mp.dates_booked") || "These dates are already booked"}</p>
            )}

            {/* Price summary */}
            {((isRange && days > 0) || (!isRange && (form.quantity || 1) > 0)) && totalPrice > 0 && (
              <div className="bg-muted/50 rounded-lg p-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {isRange
                      ? `${days} ${config.priceUnit === "/night" ? (t("mp.nights") || "night(s)") : (t("mp.days") || "day(s)")} × ${Number(service.price).toLocaleString()} ${service.currency}`
                      : `${form.quantity || 1} × ${Number(service.price).toLocaleString()} ${service.currency}`
                    }
                  </span>
                  <span className="font-bold text-foreground">{totalPrice.toLocaleString()} {service.currency}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label className="text-xs">{t("mp.notes") || "Notes"}</Label>
              <Textarea className="text-sm min-h-[60px]" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} placeholder={t("mp.special_requests") || "Special requests..."} />
            </div>

            {/* Payment method selector */}
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onSelect={setPaymentMethod}
              hasStripe={!!paymentStripe}
              hasPaypal={!!paymentPaypal}
              hasBankDetails={true}
              showOffline={true}
            />
            {paymentMethod === "bank_transfer" && (
              <p className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-lg">
                💳 {t("mp.bank_transfer_note") || "Bank transfer details will be sent after booking confirmation."}
              </p>
            )}
            {paymentMethod === "cash" && (
              <p className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-lg">
                💵 {t("mp.cash_note") || "Payment in cash upon arrival or at the time of service."}
              </p>
            )}

            {/* Legal disclaimer */}
            <MarketplaceDisclaimer compact />
          </div>
        )}

        {/* Sticky footer */}
        {service && (
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-border/50 bg-card safe-bottom">
            <span className="text-base font-bold text-foreground">{totalPrice.toLocaleString()} {service.currency}</span>
            <Button
              size="sm"
              onClick={() => onSubmit(form)}
              disabled={!isValid || isPending}
            >
              {isPending ? (t("mp.booking_in_progress") || "Booking...") : (t("mp.booking_request") || "Request Booking")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
