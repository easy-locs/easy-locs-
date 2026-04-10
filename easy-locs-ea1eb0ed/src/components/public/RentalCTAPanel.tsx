import { useState } from "react";
import { insertBookingRequest } from "@/repositories/rental.repository";
import { useI18n } from "@/lib/i18n";
import { CalendarCheck, FileText, Send, Loader2, CheckCircle, User, Mail, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  listing: any;
  property: any;
}

type RentalAction = "visit" | "apply" | "contact";

const RentalCTAPanel = ({ listing, property }: Props) => {
  const { t } = useI18n();
  const [action, setAction] = useState<RentalAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    preferred_date: "",
  });

  const priceLabel = listing.price_per_night > 0
    ? `${listing.price_per_night} € / ${t("page.rental.per_month") || "month"}`
    : t("page.rental.price_on_request") || "Price on request";

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      toast.error(t("page.rental.fill_required") || "Please fill in your name and email");
      return;
    }
    setSubmitting(true);
    try {
      await insertBookingRequest({
        listing_id: listing.id,
        property_id: listing.property_id || property?.id,
        org_id: listing.org_id,
        guest_name: form.name,
        guest_email: form.email,
        guest_phone: form.phone || null,
        message: `[${action?.toUpperCase()}] ${form.message}`.trim(),
        check_in: form.preferred_date || new Date().toISOString().slice(0, 10),
        check_out: form.preferred_date || new Date().toISOString().slice(0, 10),
        status: action === "visit" ? "visit_requested" : action === "apply" ? "application" : "inquiry",
        guests_count: 1,
      });
      setSubmitted(true);
      toast.success(t("page.rental.request_sent") || "Request sent successfully!");
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-6 space-y-3">
        <CheckCircle className="h-10 w-10 text-accent mx-auto" />
        <p className="font-semibold text-foreground">{t("page.rental.request_received") || "Request received!"}</p>
        <p className="text-xs text-muted-foreground">{t("page.rental.owner_will_contact") || "The owner will contact you shortly."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Price badge */}
      <div className="text-center">
        <span className="text-xl font-bold text-accent">{priceLabel}</span>
      </div>

      {/* CTA buttons */}
      {!action && (
        <div className="space-y-2">
          <Button
            onClick={() => setAction("visit")}
            className="w-full gap-2 rounded-xl h-11"
            variant="default"
          >
            <CalendarCheck className="h-4 w-4" />
            {t("page.rental.schedule_visit") || "Schedule a Visit"}
          </Button>
          <Button
            onClick={() => setAction("apply")}
            className="w-full gap-2 rounded-xl h-11"
            variant="outline"
          >
            <FileText className="h-4 w-4" />
            {t("page.rental.apply") || "Apply for this Rental"}
          </Button>
          <Button
            onClick={() => setAction("contact")}
            className="w-full gap-2 rounded-xl h-11"
            variant="ghost"
          >
            <MessageSquare className="h-4 w-4" />
            {t("page.rental.contact_owner") || "Contact Owner"}
          </Button>
        </div>
      )}

      {/* Form for selected action */}
      {action && (
        <div className="space-y-3">
          <button onClick={() => setAction(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← {t("page.rental.back") || "Back"}
          </button>

          <p className="text-sm font-medium text-foreground">
            {action === "visit" && (t("page.rental.schedule_visit") || "Schedule a Visit")}
            {action === "apply" && (t("page.rental.apply") || "Apply for this Rental")}
            {action === "contact" && (t("page.rental.contact_owner") || "Contact Owner")}
          </p>

          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("page.rental.your_name") || "Your name *"}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t("page.rental.your_email") || "Your email *"}
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("page.rental.your_phone") || "Phone (optional)"}
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="pl-10"
              />
            </div>

            {action === "visit" && (
              <Input
                type="date"
                value={form.preferred_date}
                onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))}
                min={new Date().toISOString().slice(0, 10)}
              />
            )}

            <textarea
              placeholder={
                action === "apply"
                  ? (t("page.rental.tell_about_yourself") || "Tell us about yourself, your situation, income…")
                  : (t("page.rental.your_message") || "Your message (optional)")
              }
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              className="w-full min-h-[80px] rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !form.name || !form.email}
            className="w-full gap-2 rounded-xl h-11"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t("page.rental.send_request") || "Send Request"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default RentalCTAPanel;
