import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { detectCustomerCurrency, computeExchangeRate } from "@/hooks/useCurrencyConversion";
import ServiceBookingCalendar from "@/components/concierge/ServiceBookingCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import { Clock, MapPin, CreditCard, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { buildAppUrl } from "@/lib/app-domain";
import { motion, AnimatePresence } from "framer-motion";

/** Rental categories that use date-range + per-day pricing */
const RANGE_CATEGORIES = new Set(["car_rental", "yacht", "accommodation", "equipment"]);

const fmtPrice = (amount: number, currency: string = "EUR") => {
  const cur = (currency || "EUR").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${cur}`;
  }
};

const PublicServiceBooking = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedRange, setSelectedRange] = useState<{ from: Date; to: Date } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [idDocUploading, setIdDocUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!slug) { if (mounted) setLoading(false); return; }
      const normalizedSlug = decodeURIComponent(slug).trim();

      // 1. Try concierge_services_public first (safe view excludes sensitive fields)
      const { data: exactMatch } = await supabase
        .from("concierge_services_public" as any)
        .select("*")
        .eq("booking_slug", normalizedSlug)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let resolvedService: any = exactMatch ? { ...(exactMatch as any), _source: "concierge" } : null;

      if (!resolvedService) {
        const { data: fallbackMatch } = await supabase
          .from("concierge_services_public" as any)
          .select("*")
          .ilike("booking_slug", normalizedSlug)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fallbackMatch) resolvedService = { ...(fallbackMatch as any), _source: "concierge" };
      }

      // 2. If not found in concierge, try marketplace_services
      if (!resolvedService) {
        const { data: mpExact } = await supabase
          .from("marketplace_services_public" as any)
          .select("*")
          .eq("booking_slug", normalizedSlug)
          .limit(1)
          .maybeSingle();

        if (mpExact) {
          resolvedService = { ...(mpExact as any), _source: "marketplace" };
        } else {
          const { data: mpFallback } = await supabase
            .from("marketplace_services_public" as any)
            .select("*")
            .ilike("booking_slug", normalizedSlug)
            .limit(1)
            .maybeSingle();
          if (mpFallback) resolvedService = { ...(mpFallback as any), _source: "marketplace" };
        }
      }

      if (!mounted) return;
      setService(resolvedService ?? null);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [slug]);

  useEffect(() => {
    if (searchParams.get("payment") === "success") setSuccess(true);
  }, [searchParams]);

  const canonicalUrl = buildAppUrl(slug ? `/book/${encodeURIComponent(slug)}` : "/book");

  // Determine if this is a range-based rental
  const isRangeMode = service ? RANGE_CATEGORIES.has(service.category) : false;

  // Calculate days and total for range mode
  const rangeDays = selectedRange
    ? differenceInCalendarDays(selectedRange.to, selectedRange.from)
    : 0;

  const totalPrice = isRangeMode && rangeDays > 0
    ? service?.price * rangeDays
    : service?.price * quantity;

  const photos: string[] = service
    ? (Array.isArray(service.photo_urls) ? service.photo_urls : service.photo_url ? [service.photo_url] : [])
    : [];

  const ogImage = photos[0] || undefined;

  if (loading) return (
    <>
      <SEOHead title="Service booking | Easy-Locs" description="Book trusted services online with Easy-Locs." canonical={canonicalUrl} />
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </>
  );

  if (!service) return (
    <>
      <SEOHead title="Service not found | Easy-Locs" description="This booking link is invalid or expired." canonical={canonicalUrl} />
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Service not found</h1>
          <p className="text-muted-foreground">This booking link may be expired or invalid.</p>
        </div>
      </div>
    </>
  );

  if (success) return (
    <>
      <SEOHead
        title={`${service.title} booking confirmed | Easy-Locs`}
        description={`Your booking for ${service.title} has been confirmed.`}
        canonical={canonicalUrl}
        ogImage={ogImage}
      />
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md mx-auto w-full">
          <CardContent className="pt-8 pb-8 space-y-5">
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-16 w-16 text-accent mx-auto" />
              <h1 className="text-2xl font-bold text-foreground">Booking Confirmed!</h1>
              <p className="text-muted-foreground">Your booking for <strong>{service.title}</strong> has been received.</p>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              {isRangeMode && selectedRange ? (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">From</span><span className="text-foreground">{format(selectedRange.from, "dd/MM/yyyy")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">To</span><span className="text-foreground">{format(selectedRange.to, "dd/MM/yyyy")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="text-foreground">{rangeDays} days</span></div>
                </>
              ) : (
                <>
                  {selectedDate && <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="text-foreground">{format(selectedDate, "dd/MM/yyyy")}</span></div>}
                  {selectedTime && <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="text-foreground">{selectedTime}</span></div>}
                </>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="text-foreground font-bold text-accent">{fmtPrice(totalPrice, service.currency)}</span></div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground text-center">
              {paymentMethod === "bank_transfer"
                ? "Please complete the bank transfer using the details provided. Your booking will be confirmed upon receipt."
                : "The provider will confirm your booking shortly. You'll receive an email notification."}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const timeSlots = Array.isArray(service.time_slots) ? service.time_slots : [];
  const blockedDates = Array.isArray(service.blocked_dates) ? service.blocked_dates : [];
  const availablePayments: string[] = Array.isArray(service.payment_methods) ? service.payment_methods : ["stripe"];
  const bankDetails = typeof service.bank_details === "object" ? service.bank_details : {};

  const canProceedStep1 = isRangeMode ? (selectedRange && rangeDays > 0) : !!selectedDate;

  const handleSubmit = async () => {
    if (!form.name || !form.email) { toast.error("Please fill all required fields"); return; }
    if (isRangeMode && !selectedRange) { toast.error("Please select dates"); return; }
    if (!isRangeMode && !selectedDate) { toast.error("Please select a date"); return; }

    setSubmitting(true);
    try {
      // Check availability before booking
      const dateFrom = isRangeMode ? format(selectedRange!.from, "yyyy-MM-dd") : format(selectedDate!, "yyyy-MM-dd");
      const dateTo = isRangeMode ? format(selectedRange!.to, "yyyy-MM-dd") : null;

      const { data: available } = await supabase.rpc("check_service_availability", {
        p_service_id: service.id,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });

      if (available === false) {
        toast.error("These dates are no longer available. Please select different dates.");
        setStep(1);
        setSubmitting(false);
        return;
      }

      const idDocUrl = (form as any).id_document_url || null;
      const isConcierge = service._source === "concierge" || !service._source;

      if (isConcierge) {
        // Insert into concierge_orders
        const orderData: any = {
          org_id: service.org_id,
          service_id: service.id,
          property_id: service.property_id || null,
          property_label: service.title,
          guest_name: form.name,
          guest_email: form.email,
          guest_phone: form.phone,
          notes: form.notes,
          quantity: isRangeMode ? rangeDays : quantity,
          unit_price: service.price,
          total_price: totalPrice,
          currency: service.currency || "EUR",
          customer_currency: detectCustomerCurrency(),
          exchange_rate: computeExchangeRate(service.currency || "EUR", detectCustomerCurrency()),
          service_date: dateFrom,
          end_time: dateTo,
          service_time: selectedTime || null,
          payment_method: paymentMethod,
          status: "pending",
          payment_status: paymentMethod === "bank_transfer" ? "awaiting_transfer" : "unpaid",
          commission_type: service.commission_type || "percentage",
          commission_rate: service.commission_amount || 0,
          commission_amount: service.commission_type === "fixed"
            ? service.commission_amount
            : (service.price * (service.commission_amount || 0)) / 100,
          ...(idDocUrl ? { document_urls: [idDocUrl] } : {}),
        };

        const { data: order, error: orderError } = await supabase
          .from("concierge_orders")
          .insert(orderData)
          .select()
          .single();
        if (orderError) throw orderError;

        // Send notification
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              event_type: "booking_request",
              recipient_email: null,
              org_id: service.org_id,
              data: {
                guest_name: form.name,
                guest_email: form.email,
                service_title: service.title,
                service_date: dateFrom,
                total_price: String(totalPrice),
                currency: service.currency || "EUR",
              },
              locale: "en",
            },
          });
        } catch (e) { console.error("Notification email error:", e); }

        if (paymentMethod === "stripe") {
          const { data: checkout, error: checkoutError } = await supabase.functions.invoke("create-concierge-payment", {
            body: {
              order_id: order.id,
              service_id: service.id,
              amount: totalPrice,
              currency: service.currency || "EUR",
              guest_email: form.email,
              guest_name: form.name,
              service_title: service.title,
              origin: window.location.origin,
              booking_slug: slug,
            },
          });
          if (checkoutError) throw checkoutError;
          if (checkout?.url) { window.location.href = checkout.url; return; }
        }
      } else {
        // Insert into marketplace_bookings
        const bookingData: any = {
          service_id: service.id,
          provider_id: service.provider_id,
          org_id: service.org_id,
          booker_name: form.name,
          booker_email: form.email,
          booker_phone: form.phone,
          service_date: dateFrom,
          service_time: selectedTime || null,
          quantity: isRangeMode ? rangeDays : quantity,
          total_price: totalPrice,
          currency: service.currency || "EUR",
          customer_currency: detectCustomerCurrency(),
          exchange_rate: computeExchangeRate(service.currency || "EUR", detectCustomerCurrency()),
          notes: form.notes,
          date_from: isRangeMode ? dateFrom : null,
          date_to: dateTo,
          payment_method: paymentMethod,
          status: "pending",
        };

        const { error: bookingError } = await supabase
          .from("marketplace_bookings")
          .insert(bookingData);
        if (bookingError) throw bookingError;

        // Send notification
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              event_type: "booking_request",
              recipient_email: null,
              org_id: service.org_id,
              data: {
                guest_name: form.name,
                guest_email: form.email,
                service_title: service.title,
                service_date: dateFrom,
                total_price: String(totalPrice),
                currency: service.currency || "EUR",
              },
              locale: "en",
            },
          });
        } catch (e) { console.error("Notification email error:", e); }
      }

      setSuccess(true);
      toast.success("Booking submitted!");
    } catch (err: any) {
      toast.error(err.message || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const PAYMENT_LABELS: Record<string, string> = {
    stripe: "💳 Card (Stripe)",
    paypal: "🅿️ PayPal",
    bank_transfer: "🏦 Bank Transfer",
  };

  return (
    <>
      <SEOHead
        title={`${service.title} — Book Now | Easy-Locs`}
        description={service.description || `Book ${service.title} on Easy-Locs`}
        ogImage={ogImage}
        canonical={canonicalUrl}
      />
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Photo Gallery */}
          {photos.length > 0 && (
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-6 bg-muted">
              <AnimatePresence mode="wait">
                <motion.img
                  key={photoIndex}
                  src={photos[photoIndex]}
                  alt={service.title}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </AnimatePresence>
              {photos.length > 1 && (
                <>
                  <button onClick={() => setPhotoIndex((photoIndex - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => setPhotoIndex((photoIndex + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                      <button key={i} onClick={() => setPhotoIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === photoIndex ? "bg-white" : "bg-white/40"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {photos.length > 1 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {photos.map((url, i) => (
                <button key={i} onClick={() => setPhotoIndex(i)}
                  className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${i === photoIndex ? "border-accent" : "border-transparent"}`}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Service Info */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{service.title}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {service.city && (
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" /> {service.city}{service.country ? `, ${service.country}` : ""}
                    </Badge>
                  )}
                  {service.duration_minutes && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" /> {service.duration_minutes} min
                    </Badge>
                  )}
                  {isRangeMode && (
                    <Badge variant="secondary" className="text-xs">
                      {fmtPrice(service.price, service.currency)} / day
                    </Badge>
                  )}
                </div>
              </div>

              {service.description && (
                <p className="text-muted-foreground leading-relaxed">{service.description}</p>
              )}

              {/* Provider Info */}
              {service.provider_name && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                    {service.provider_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{service.provider_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {service.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{service.city}{service.country ? `, ${service.country}` : ""}</span>}
                      {service.provider_phone && <span>{service.provider_phone}</span>}
                    </div>
                  </div>
                </div>
              )}

              {service.conditions && (
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Conditions</h3>
                  <p className="text-sm text-muted-foreground">{service.conditions}</p>
                </div>
              )}

              {service.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {service.location}
                </div>
              )}

              <Separator />

              {/* Step Indicators */}
              <div className="flex items-center gap-2 justify-center">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      step >= s ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                    }`}>{s}</div>
                    {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-accent" : "bg-muted"}`} />}
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {step === 1 && (isRangeMode ? "Select your dates" : "Choose date & time")}
                {step === 2 && "Your information"}
                {step === 3 && "Payment & confirmation"}
              </p>

              {step === 1 && (
                <div>
                  <ServiceBookingCalendar
                    serviceId={service.id}
                    timeSlots={isRangeMode ? [] : timeSlots}
                    blockedDates={blockedDates}
                    maxCapacity={service.max_capacity}
                    rangeMode={isRangeMode}
                    onSelect={(d, t) => { setSelectedDate(d); setSelectedTime(t); }}
                    onSelectRange={(from, to) => setSelectedRange({ from, to })}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    selectedRange={selectedRange}
                  />

                  {isRangeMode && rangeDays > 0 && (
                    <div className="mt-3 p-3 bg-accent/5 rounded-xl text-center">
                      <p className="text-sm text-foreground font-medium">
                        {rangeDays} {rangeDays === 1 ? "day" : "days"} × {fmtPrice(service.price, service.currency)} = <strong className="text-accent">{fmtPrice(totalPrice, service.currency)}</strong>
                      </p>
                    </div>
                  )}

                  <Button className="w-full mt-4" disabled={!canProceedStep1}
                    onClick={() => setStep(2)}>
                    Continue
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Full Name *</label>
                      <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Email *</label>
                      <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Phone</label>
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>

                  {service.requires_id_document && (
                    <div>
                      <label className="text-xs text-muted-foreground font-medium">🪪 ID Document *</label>
                      <p className="text-[11px] text-muted-foreground mb-2">This service requires a copy of your identity document.</p>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error("File too large (max 10MB)");
                            return;
                          }

                          setIdDocUploading(true);
                          try {
                            const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
                            const path = `${service.org_id}/id-docs/${crypto.randomUUID()}.${ext}`;
                            const { error } = await supabase.storage.from("booking-documents").upload(path, file, { upsert: true });

                            if (error) {
                              console.error("ID upload error:", error);
                              toast.error("Upload failed: " + (error.message || "Unknown error"));
                              return;
                            }

                            // Store path only — bucket is private, managers use signed URLs
                            setForm((f) => ({ ...f, id_document_url: path }));
                            toast.success("ID document uploaded");
                          } finally {
                            setIdDocUploading(false);
                          }
                        }}
                        className="cursor-pointer"
                      />
                      {idDocUploading && (
                        <p className="text-xs text-muted-foreground mt-1">Upload en cours...</p>
                      )}
                      {(form as any).id_document_url && !idDocUploading && (
                        <p className="text-xs text-accent mt-1">✓ Document uploaded</p>
                      )}
                    </div>
                  )}

                  {!isRangeMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Notes</label>
                        <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Quantity</label>
                        <Input type="number" min={1} value={quantity || ""} onChange={e => setQuantity(e.target.value === "" ? 1 : Math.max(1, Number(e.target.value)))} placeholder="1" />
                        {quantity > 1 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {quantity} × {fmtPrice(service.price, service.currency)} = <strong>{fmtPrice(service.price * quantity, service.currency)}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {isRangeMode && (
                    <div>
                      <label className="text-xs text-muted-foreground">Notes</label>
                      <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                    <Button onClick={() => setStep(3)} disabled={idDocUploading || !form.name || !form.email || (service.requires_id_document && !(form as any).id_document_url)} className="flex-1">Continue</Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Payment Method</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {availablePayments.map(pm => (
                      <button key={pm} onClick={() => setPaymentMethod(pm)}
                        className={`p-4 rounded-xl border-2 text-left transition-colors ${
                          paymentMethod === pm ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                        }`}>
                        <span className="text-sm font-medium text-foreground">{PAYMENT_LABELS[pm] || pm}</span>
                      </button>
                    ))}
                  </div>

                  {paymentMethod === "bank_transfer" && Object.keys(bankDetails).length > 0 && (
                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">Bank Details</h4>
                      {bankDetails.bank_name && <p className="text-sm text-muted-foreground">Bank: {bankDetails.bank_name}</p>}
                      {bankDetails.iban && <p className="text-sm text-muted-foreground font-mono">IBAN: {bankDetails.iban}</p>}
                      {bankDetails.swift && <p className="text-sm text-muted-foreground font-mono">SWIFT: {bankDetails.swift}</p>}
                      {bankDetails.account_holder && <p className="text-sm text-muted-foreground">Holder: {bankDetails.account_holder}</p>}
                      {bankDetails.instructions && <p className="text-sm text-muted-foreground italic">{bankDetails.instructions}</p>}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                    <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                      {paymentMethod === "stripe" ? `Pay ${fmtPrice(totalPrice, service.currency)}` : "Confirm Booking"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardContent className="pt-6 space-y-4">
                  <h3 className="font-semibold text-foreground">Booking Summary</h3>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service</span>
                      <span className="text-foreground font-medium truncate ml-2">{service.title}</span>
                    </div>

                    {isRangeMode && selectedRange ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">From</span>
                          <span className="text-foreground">{format(selectedRange.from, "dd/MM/yyyy")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">To</span>
                          <span className="text-foreground">{format(selectedRange.to, "dd/MM/yyyy")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="text-foreground">{rangeDays} {rangeDays === 1 ? "day" : "days"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rate</span>
                          <span className="text-foreground">{fmtPrice(service.price, service.currency)} / day</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {selectedDate && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date</span>
                            <span className="text-foreground">{format(selectedDate, "dd/MM/yyyy")}</span>
                          </div>
                        )}
                        {selectedTime && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time</span>
                            <span className="text-foreground">{selectedTime}</span>
                          </div>
                        )}
                        {service.duration_minutes && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration</span>
                            <span className="text-foreground">{service.duration_minutes} min</span>
                          </div>
                        )}
                        {quantity > 1 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Quantity</span>
                            <span className="text-foreground">{quantity} × {fmtPrice(service.price, service.currency)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-2xl font-bold text-accent">{fmtPrice(totalPrice, service.currency)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PublicServiceBooking;
