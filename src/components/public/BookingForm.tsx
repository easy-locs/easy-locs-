import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Send, Loader2, CheckCircle } from "lucide-react";
import { buildAppUrl } from "@/lib/app-domain";

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

  const nights = useMemo(() => {
    if (!form.check_in || !form.check_out) return 0;
    const diff = new Date(form.check_out).getTime() - new Date(form.check_in).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [form.check_in, form.check_out]);

  const totalPrice = nights * (listing?.price_per_night || 0) + (nights > 0 ? cleaningFee : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing || !property || submitting) return;
    if (!form.guest_name || !form.guest_email || !form.check_in || !form.check_out) return;

    setSubmitting(true);
    const { data: insertedRequest, error } = await supabase.from("booking_requests").insert({
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
    } as any).select().single();

    if (error) {
      setSubmitting(false);
      alert(t("page.listing.error_submit"));
      return;
    }

    try {
      await supabase.functions.invoke("notify-booking", {
        body: { booking_request_id: insertedRequest.id },
      });
    } catch (e) {
      console.error("Notification error:", e);
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  const today = new Date().toISOString().slice(0, 10);
  const updateField = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }));

  if (submitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">{t("page.listing.request_sent")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("page.listing.request_sent_desc")}</p>
        <p className="text-xs text-muted-foreground">{t("page.listing.awaiting_approval")}</p>
      </div>
    );
  }

  return (
    <>
      <h3 className="font-semibold text-foreground text-center text-base">{t("page.listing.book_title")}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <fieldset className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing.full_name")} *</label>
          <input
            required
            autoComplete="name"
            value={form.guest_name}
            onChange={e => updateField("guest_name", e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
          />
        </fieldset>

        {/* Email */}
        <fieldset className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing.email")} *</label>
          <input
            required
            type="email"
            autoComplete="email"
            inputMode="email"
            value={form.guest_email}
            onChange={e => updateField("guest_email", e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
          />
        </fieldset>

        {/* Phone */}
        <fieldset className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing.phone")}</label>
          <input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={form.guest_phone}
            onChange={e => updateField("guest_phone", e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
          />
        </fieldset>

        {/* Dates - perfectly aligned */}
        <div className="grid grid-cols-2 gap-3">
          <fieldset className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("page.listing.check_in")} *</label>
            <input
              required
              type="date"
              value={form.check_in}
              min={today}
              onChange={e => updateField("check_in", e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow appearance-none"
            />
          </fieldset>
          <fieldset className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("page.listing.check_out")} *</label>
            <input
              required
              type="date"
              value={form.check_out}
              min={form.check_in || today}
              onChange={e => updateField("check_out", e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow appearance-none"
            />
          </fieldset>
        </div>

        {/* Guests count - min 1 */}
        <fieldset className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing.guests_count")}</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={listing.max_guests || 20}
            value={form.guests_count}
            onChange={e => {
              const val = Math.max(1, Math.min(listing.max_guests || 20, parseInt(e.target.value) || 1));
              updateField("guests_count", val);
            }}
            onFocus={e => e.target.select()}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
          />
        </fieldset>

        {/* Message */}
        <fieldset className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t("page.listing.message")}</label>
          <textarea
            value={form.message}
            onChange={e => updateField("message", e.target.value)}
            rows={2}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
            placeholder={t("page.listing.message_placeholder")}
          />
        </fieldset>

        {/* Price summary */}
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

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-accent text-accent-foreground py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 min-h-[48px]"
        >
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
