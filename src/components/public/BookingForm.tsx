import { useState, useMemo, useEffect } from "react";
import { insertBookingRequest, invokeNotifyBooking } from "@/repositories/rental.repository";
import { dispatchSyncEvent } from "@/lib/shared/sync-engine";
import { auditBookingResult } from "@/lib/ai-audit";
import { useI18n } from "@/lib/i18n";
import { Send, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { buildAppUrl } from "@/lib/app-domain";
import { toast } from "sonner";
import BookingAvailabilityCalendar from "./BookingAvailabilityCalendar";
import GuestBookingReply from "./GuestBookingReply";
import PaymentMethodSelector, { type PaymentMethod } from "@/components/marketplace/PaymentMethodSelector";

interface Props {
  listing: any;
  property: any;
  cleaningFee: number;
}

const BookingForm = ({ listing, property, cleaningFee }: Props) => {
  const { t } = useI18n();
  const [form, setForm] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    check_in: "",
    check_out: "",
    guests_count: 1,
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [submittedBookingId, setSubmittedBookingId] = useState<string | null>(null);
  const [bookedDates, setBookedDates] = useState<{ check_in: string; check_out: string }[]>([]);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Dynamic max guests from listing/property
  const maxGuests = useMemo(() => {
    const fromListing = listing?.max_guests;
    const fromProperty = property?.guest_capacity || property?.max_guests;
    const val = fromListing || fromProperty;
    return val && val > 0 ? val : 20;
  }, [listing?.max_guests, property?.guest_capacity, property?.max_guests]);

  // Load existing bookings for availability
  useEffect(() => {
    if (!property?.id) return;
    const loadBookings = async () => {
      const [{ data: seasonal }, { data: requests }] = await Promise.all([
        supabase
          .from("seasonal_bookings" as any)
          .select("check_in, check_out, status")
          .eq("property_id", property.id)
          .neq("status", "cancelled"),
        supabase
          .from("booking_requests")
          .select("check_in, check_out, status")
          .eq("property_id", property.id)
          .in("status", ["confirmed", "paid", "approved", "payment_pending"]),
      ]);
      const all = [
        ...(seasonal || []).map((b: any) => ({ check_in: b.check_in, check_out: b.check_out })),
        ...(requests || []).map((b: any) => ({ check_in: b.check_in, check_out: b.check_out })),
      ];
      const seen = new Set<string>();
      setBookedDates(all.filter(b => {
        const key = `${b.check_in}-${b.check_out}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }));
    };
    loadBookings();
  }, [property?.id]);

  // Check for date overlap
  useEffect(() => {
    if (!form.check_in || !form.check_out) {
      setAvailabilityError(null);
      return;
    }
    const overlap = bookedDates.some(b => form.check_in < b.check_out && form.check_out > b.check_in);
    setAvailabilityError(overlap ? t("page.listing.dates_unavailable") || "These dates are not available" : null);
  }, [form.check_in, form.check_out, bookedDates, t]);

  const nights = useMemo(() => {
    if (!form.check_in || !form.check_out) return 0;
    const diff = new Date(form.check_out).getTime() - new Date(form.check_in).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [form.check_in, form.check_out]);

  const minNightsError = nights > 0 && listing?.min_nights && nights < listing.min_nights;
  const totalPrice = nights * (listing?.price_per_night || 0) + (nights > 0 ? cleaningFee : 0);
  const formReady = !!listing && !!property?.id && !!form.guest_name && !!form.guest_email && !!form.check_in && !!form.check_out && !availabilityError && !minNightsError && nights > 0;

  // Minimum check-out date based on min_nights
  const minCheckOut = useMemo(() => {
    if (!form.check_in) return new Date().toISOString().slice(0, 10);
    const d = new Date(form.check_in);
    d.setDate(d.getDate() + (listing?.min_nights || 1));
    return d.toISOString().slice(0, 10);
  }, [form.check_in, listing?.min_nights]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReady || submitting) return;

    setSubmitting(true);
    let insertedRequest: any;
    try {
      insertedRequest = await insertBookingRequest({
        listing_id: listing.id,
        property_id: property.id,
        org_id: listing.org_id,
        guest_name: form.guest_name,
        guest_email: form.guest_email,
        guest_phone: form.guest_phone,
        check_in: form.check_in,
        check_out: form.check_out,
        guests_count: form.guests_count,
        message: form.message,
      });
    } catch (error: any) {
      console.error("Booking insert error:", error?.message);
      auditBookingResult(false, { module: "seasonal", error: error?.message || "Insert failed" });
      setSubmitting(false);
      toast.error(t("page.listing.error_submit") || "Booking request failed", {
        description: error?.message || "Please try again.",
        duration: 8000,
      });
      return;
    }

    auditBookingResult(true, { bookingId: insertedRequest.id, module: "seasonal" });

    dispatchSyncEvent({
      type: "booking_request",
      context: {
        orgId: listing.org_id,
        propertyId: property.id,
        bookingId: insertedRequest.id,
        countryCode: property.country || "",
      },
      actorUserId: "",
      targetEmail: listing.contact_email || undefined,
      guestName: form.guest_name,
      checkIn: form.check_in,
      checkOut: form.check_out,
      listingTitle: listing.title || property.label || "",
    }).catch(() => {});

    try {
      await invokeNotifyBooking(insertedRequest.id);
    } catch (e) {
      console.error("Guest notification error:", e);
    }

    setSubmitting(false);
    setSubmittedBookingId(insertedRequest.id);
    setSubmitted(true);
  };

  const today = new Date().toISOString().slice(0, 10);
  const updateField = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }));

  if (submitted && submittedBookingId) {
    return (
      <div className="space-y-6">
        <div className="text-center py-6">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">{t("page.listing.request_sent")}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t("page.listing.request_sent_desc")}</p>
          <p className="text-xs text-muted-foreground">{t("page.listing.awaiting_approval")}</p>
        </div>
        {/* Bidirectional communication thread */}
        <GuestBookingReply
          bookingId={submittedBookingId}
          guestName={form.guest_name}
          guestEmail={form.guest_email}
        />
      </div>
    );
  }

  if (!property?.id) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">{t("page.listing.loading") || "Loading property details…"}</p>
      </div>
    );
  }

  return (
    <>
      <h3 className="font-semibold text-foreground text-center text-base">{t("page.listing.book_title")}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing.full_name")} *</label>
          <input required autoComplete="name" value={form.guest_name} onChange={e => updateField("guest_name", e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow" />
        </fieldset>

        <fieldset className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing.email")} *</label>
          <input required type="email" autoComplete="email" inputMode="email" value={form.guest_email} onChange={e => updateField("guest_email", e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow" />
        </fieldset>

        <fieldset className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing.phone")}</label>
          <input type="tel" autoComplete="tel" inputMode="tel" value={form.guest_phone} onChange={e => updateField("guest_phone", e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow" />
        </fieldset>

        {/* Visual availability calendars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BookingAvailabilityCalendar
            label={t("page.listing.check_in")}
            value={form.check_in}
            onChange={(v) => {
              updateField("check_in", v);
              // Reset check_out if it's before new check_in
              if (form.check_out && form.check_out <= v) updateField("check_out", "");
            }}
            minDate={today}
            bookedDates={bookedDates}
          />
          <BookingAvailabilityCalendar
            label={t("page.listing.check_out")}
            value={form.check_out}
            onChange={(v) => updateField("check_out", v)}
            minDate={minCheckOut}
            bookedDates={bookedDates}
          />
        </div>

        {availabilityError && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-xs p-3 rounded-xl">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{availabilityError}</span>
          </div>
        )}

        {minNightsError && (
          <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 text-xs p-3 rounded-xl">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{t("page.listing.min_nights").replace("{n}", String(listing.min_nights))} minimum</span>
          </div>
        )}

        <fieldset className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("page.listing.guests_count")} <span className="text-muted-foreground/60">(max {maxGuests})</span>
          </label>
          <div className="flex items-center gap-0 border border-border rounded-xl overflow-hidden bg-background">
            <button
              type="button"
              onClick={() => updateField("guests_count", Math.max(1, form.guests_count - 1))}
              disabled={form.guests_count <= 1}
              className="h-12 w-12 flex items-center justify-center text-lg font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              aria-label="Decrease guests"
            >−</button>
            <div className="flex-1 text-center">
              <span className="text-base font-semibold text-foreground">{form.guests_count}</span>
              <span className="text-xs text-muted-foreground ml-1">/ {maxGuests}</span>
            </div>
            <button
              type="button"
              onClick={() => updateField("guests_count", Math.min(maxGuests, form.guests_count + 1))}
              disabled={form.guests_count >= maxGuests}
              className="h-12 w-12 flex items-center justify-center text-lg font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              aria-label="Increase guests"
            >+</button>
          </div>
          {form.guests_count >= maxGuests && (
            <p className="text-[10px] text-amber-500 mt-1">{t("page.listing.max_guests_reached") || `Maximum ${maxGuests} guests`}</p>
          )}
        </fieldset>

        <fieldset className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing.message")}</label>
          <textarea value={form.message} onChange={e => updateField("message", e.target.value)} rows={2}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
            placeholder={t("page.listing.message_placeholder")} />
        </fieldset>

        {nights > 0 && listing.price_per_night > 0 && (
          <div className="bg-muted/50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground whitespace-nowrap">{nights} {t("page.listing.nights")} × {listing.price_per_night}€</span>
              <span className="text-foreground font-medium whitespace-nowrap">{nights * listing.price_per_night}€</span>
            </div>
            {cleaningFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("page.listing.cleaning")}</span>
                <span className="text-foreground whitespace-nowrap">{cleaningFee}€</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1.5">
              <span className="font-semibold text-foreground">{t("page.listing.total")}</span>
              <span className="font-bold text-foreground whitespace-nowrap">{totalPrice}€</span>
            </div>
          </div>
        )}

        {/* Payment method selection */}
        {nights > 0 && totalPrice > 0 && (
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelect={setPaymentMethod}
            showOffline
          />
        )}

        {paymentMethod === "bank_transfer" && (
          <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
            💳 {t("page.listing.bank_transfer_note") || "Bank transfer details will be sent after your booking is confirmed."}
          </div>
        )}
        {paymentMethod === "cash" && (
          <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
            💵 {t("page.listing.cash_note") || "Cash payment on arrival after booking confirmation."}
          </div>
        )}

        <button type="submit" disabled={submitting || !formReady}
          className="w-full bg-accent text-accent-foreground py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t("page.listing.send_request")}
        </button>

        {nights > 0 && totalPrice > 0 && (
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            {t("page.listing.approval_note")}
          </p>
        )}
      </form>
    </>
  );
};

export default BookingForm;
