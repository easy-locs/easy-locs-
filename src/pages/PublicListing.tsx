import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { MapPin, Users, Moon, Euro, ChevronLeft, ChevronRight, Send, Loader2, CheckCircle, CreditCard } from "lucide-react";

const PublicListing = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const [listing, setListing] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [bookedDates, setBookedDates] = useState<{ check_in: string; check_out: string }[]>([]);
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
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get("payment") === "success") setPaymentSuccess(true);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      if (!slug) { setNotFound(true); setLoading(false); return; }
      const { data: l } = await supabase
        .from("public_listings")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (!l) { setNotFound(true); setLoading(false); return; }
      setListing(l);

      const { data: p } = await supabase
        .from("properties")
        .select("*")
        .eq("id", l.property_id)
        .maybeSingle();
      setProperty(p);

      const { data: bookings } = await supabase
        .from("seasonal_bookings")
        .select("check_in, check_out")
        .eq("property_id", l.property_id)
        .neq("status", "cancelled");
      setBookedDates(bookings || []);
      setLoading(false);
    };
    load();
  }, [slug]);

  const photos: string[] = property?.photo_urls || [];
  const amenities: any[] = Array.isArray(listing?.amenities) ? listing.amenities : [];
  const stringAmenities = amenities.filter((a: any) => typeof a === "string") as string[];
  const cleaningFeeObj = amenities.find((a: any) => typeof a === "object" && a?.type === "cleaning_fee");
  const cleaningFee = typeof cleaningFeeObj === "object" && cleaningFeeObj ? (cleaningFeeObj as any).amount || 0 : 0;

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

  const handlePayNow = async () => {
    if (!listing || !property || totalPrice <= 0) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-booking-payment", {
        body: {
          listing_id: listing.id,
          guest_email: form.guest_email || "guest@temp.com",
          guest_name: form.guest_name || "Voyageur",
          amount: totalPrice,
          nights,
          property_label: listing.title || property.label,
          origin: window.location.origin,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      alert(`${t("page.listing.error_payment")}: ${err.message || ""}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("page.listing.not_found")}</h1>
          <p className="text-muted-foreground">{t("page.listing.not_found_desc")}</p>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("page.listing.payment_confirmed")}</h1>
          <p className="text-muted-foreground">{t("page.listing.payment_confirmed_desc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero photos */}
      <div className="relative w-full h-[50vh] sm:h-[60vh] bg-muted">
        {photos.length > 0 ? (
          <>
            <img src={photos[photoIndex]} alt="" className="w-full h-full object-cover" />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-2 hover:bg-background transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-2 hover:bg-background transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIndex(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === photoIndex ? "bg-white" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-muted-foreground">{t("page.listing.no_photos")}</p>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {listing.title || property?.label}
              </h1>
              <p className="text-muted-foreground flex items-center gap-1.5 mt-2">
                <MapPin className="h-4 w-4" />
                {property?.address}, {property?.postal_code} {property?.city}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              {listing.price_per_night > 0 && (
                <span className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1.5 rounded-full font-medium">
                  <Euro className="h-4 w-4" /> {listing.price_per_night}€ {t("page.listing.per_night")}
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
                <Users className="h-4 w-4" /> {listing.max_guests} {t("page.listing.guests_max")}
              </span>
              <span className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-1.5 rounded-full">
                <Moon className="h-4 w-4" /> {t("page.listing.min_nights").replace("{n}", String(listing.min_nights))}
              </span>
            </div>

            {listing.description && (
              <div>
                <h2 className="font-semibold text-foreground mb-2">{t("page.listing.description")}</h2>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

            {property?.surface && (
              <div className="text-sm text-muted-foreground">
                {t("page.listing.surface")} : {property.surface} m² · {property.rooms || 1} {t("page.listing.rooms")}
                {property.furnished && ` · ${t("page.listing.furnished")}`}
              </div>
            )}

            {stringAmenities.length > 0 && (
              <div>
                <h2 className="font-semibold text-foreground mb-2">{t("page.listing.amenities")}</h2>
                <div className="flex flex-wrap gap-2">
                  {stringAmenities.map(a => (
                    <span key={a} className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-medium">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {photos.length > 1 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIndex(i)}
                    className={`rounded-lg overflow-hidden aspect-[4/3] border-2 transition-colors ${i === photoIndex ? "border-accent" : "border-transparent"}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Booking form */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-card border border-border rounded-xl p-5 shadow-card space-y-4">
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-foreground mb-1">{t("page.listing.request_sent")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("page.listing.request_sent_desc")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("page.listing.payment_link_sent")}
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-foreground text-center">{t("page.listing.book_title")}</h3>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t("page.listing.full_name")} *</label>
                      <input
                        required
                        value={form.guest_name}
                        onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t("page.listing.email")} *</label>
                      <input
                        required
                        type="email"
                        value={form.guest_email}
                        onChange={e => setForm(p => ({ ...p, guest_email: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t("page.listing.phone")}</label>
                      <input
                        value={form.guest_phone}
                        onChange={e => setForm(p => ({ ...p, guest_phone: e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">{t("page.listing.check_in")} *</label>
                        <input
                          required
                          type="date"
                          value={form.check_in}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">{t("page.listing.check_out")} *</label>
                        <input
                          required
                          type="date"
                          value={form.check_out}
                          min={form.check_in || new Date().toISOString().slice(0, 10)}
                          onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t("page.listing.guests_count")}</label>
                      <input
                        type="number"
                        min={1}
                        max={listing.max_guests}
                        value={form.guests_count}
                        onChange={e => setForm(p => ({ ...p, guests_count: +e.target.value }))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{t("page.listing.message")}</label>
                      <textarea
                        value={form.message}
                        onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                        rows={2}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mt-1 resize-none"
                        placeholder={t("page.listing.message_placeholder")}
                      />
                    </div>

                    {nights > 0 && listing.price_per_night > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{nights} {t("page.listing.nights")} × {listing.price_per_night}€</span>
                          <span className="text-foreground">{nights * listing.price_per_night}€</span>
                        </div>
                        {cleaningFee > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("page.listing.cleaning")}</span>
                            <span className="text-foreground">{cleaningFee}€</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-border pt-1">
                          <span className="font-medium text-foreground">{t("page.listing.total")}</span>
                          <span className="font-semibold text-foreground">{totalPrice}€</span>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {t("page.listing.send_request")}
                    </button>

                    {nights > 0 && totalPrice > 0 && form.guest_email && form.guest_name && (
                      <button
                        type="button"
                        onClick={handlePayNow}
                        disabled={submitting}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        {t("page.listing.pay_now")} {totalPrice}€
                      </button>
                    )}
                    {nights > 0 && totalPrice > 0 && (
                      <p className="text-[10px] text-muted-foreground text-center">
                        {t("page.listing.stripe_note") || "Stripe · Apple Pay / Google Pay"}
                      </p>
                    )}
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border">
        {t("page.tsignup.powered_by")} <span className="font-semibold">EASY-LOCS®</span>
      </footer>
    </div>
  );
};

export default PublicListing;
