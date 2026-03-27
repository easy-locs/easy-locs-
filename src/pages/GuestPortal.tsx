import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { usePublicLocale } from "@/hooks/usePublicLocale";
import PublicLanguageSwitcher from "@/components/public/PublicLanguageSwitcher";
import AppLogo from "@/components/AppLogo";
import { Loader2, CalendarDays, MapPin, Users, Euro, MessageSquare, Sparkles, Send, CheckCircle2, Clock, CreditCard, ShoppingBag, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const GuestPortal = () => {
  const [params] = useSearchParams();
  const bookingId = params.get("booking");
  const { t, setLocale } = useI18n();
  const { locale, changeLocale, supportedLocales } = usePublicLocale();
  const [booking, setBooking] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"stay" | "services" | "activities" | "messages">("stay");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [orderingServiceId, setOrderingServiceId] = useState<string | null>(null);
  const [orderingActivityId, setOrderingActivityId] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => { setLocale(locale); }, [locale, setLocale]);

  const loadMessages = useCallback(async (orgId: string, guestEmail: string) => {
    // Load guest messages from booking_requests messages or concierge_orders notes
    const { data } = await (supabase as any)
      .from("app_notifications")
      .select("*")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .order("created_at", { ascending: true })
      .limit(50);
    setMessages(data || []);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) { setNotFound(true); setLoading(false); return; }

      // Try seasonal_bookings first
      const { data: b } = await supabase
        .from("seasonal_bookings" as any)
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      let bookingData: any = b;
      let source = "seasonal";

      if (!b) {
        const { data: br } = await supabase
          .from("booking_requests")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle() as any;
        if (!br) { setNotFound(true); setLoading(false); return; }
        bookingData = br;
        source = "request";
      }

      setBooking({ ...bookingData, source });

      const [{ data: p }, { data: svc }, { data: act }, { data: orgData }] = await Promise.all([
        supabase.from("properties").select("*").eq("id", bookingData.property_id).maybeSingle(),
        supabase.from("concierge_services_public" as any).select("*").eq("org_id", bookingData.org_id).order("sort_order"),
        supabase.from("activities_public" as any).select("*").eq("org_id", bookingData.org_id).order("sort_order"),
        supabase.from("orgs").select("name, email, phone, logo_url, brand_name").eq("id", bookingData.org_id).maybeSingle(),
      ]);
      setProperty(p);
      setServices(svc || []);
      setActivities(act || []);
      setOrg(orgData);

      if (bookingData.guest_email && bookingData.org_id) {
        await loadMessages(bookingData.org_id, bookingData.guest_email);
      }
      setLoading(false);
    };
    load();
  }, [bookingId, loadMessages]);

  const nights = booking
    ? Math.max(1, Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000))
    : 0;

  const statusColor = (s: string) => {
    if (["confirmed", "paid", "checked_in"].includes(s)) return "bg-emerald-500/10 text-emerald-600";
    if (["pending", "awaiting_payment", "payment_pending"].includes(s)) return "bg-amber-500/10 text-amber-600";
    if (["cancelled", "refunded"].includes(s)) return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  // Order a concierge service
  const orderService = async (service: any) => {
    if (!booking || orderingServiceId) return;
    setOrderingServiceId(service.id);
    try {
      const { error } = await supabase.from("concierge_orders").insert({
        org_id: booking.org_id,
        service_id: service.id,
        property_id: booking.property_id,
        booking_id: booking.id,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email || "",
        guest_phone: booking.guest_phone || "",
        quantity: 1,
        unit_price: service.price,
        total_price: service.price,
        currency: service.currency || "EUR",
        scheduled_at: booking.check_in,
        status: "pending",
        payment_status: "unpaid",
        notes: `Requested via Guest Portal for booking ${booking.id}`,
      } as any);
      if (error) throw error;

      // Notify the owner
      await (supabase as any).from("app_notifications").insert({
        user_id: (await supabase.from("orgs").select("owner_user_id").eq("id", booking.org_id).single()).data?.owner_user_id || "",
        scope: "global", category: "service_request",
        title: "🛎️ New service request",
        body: `${booking.guest_name} requested "${service.title}" (${service.price}${service.currency || "€"})`,
        severity: "info", route: "/dashboard/activities",
      });

      setOrderSuccess(service.id);
      setTimeout(() => setOrderSuccess(null), 3000);
      toast.success(`"${service.title}" requested successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to request service");
    } finally {
      setOrderingServiceId(null);
    }
  };

  // Book an activity
  const bookActivity = async (activity: any) => {
    if (!booking || orderingActivityId) return;
    setOrderingActivityId(activity.id);
    try {
      const { error } = await supabase.from("concierge_orders").insert({
        org_id: booking.org_id,
        service_id: activity.id,
        property_id: booking.property_id,
        booking_id: booking.id,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email || "",
        guest_phone: booking.guest_phone || "",
        quantity: 1,
        unit_price: activity.price,
        total_price: activity.price,
        currency: activity.currency || "EUR",
        status: "pending",
        payment_status: "unpaid",
        notes: `Activity booking via Guest Portal: ${activity.title}`,
      } as any);
      if (error) throw error;

      await (supabase as any).from("app_notifications").insert({
        user_id: (await supabase.from("orgs").select("owner_user_id").eq("id", booking.org_id).single()).data?.owner_user_id || "",
        scope: "global", category: "activity_booking",
        title: "🎯 New activity booking",
        body: `${booking.guest_name} wants to book "${activity.title}" (${activity.price}${activity.currency || "€"})`,
        severity: "info", route: "/dashboard/activities",
      });

      setOrderSuccess(activity.id);
      setTimeout(() => setOrderSuccess(null), 3000);
      toast.success(`"${activity.title}" booked successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to book activity");
    } finally {
      setOrderingActivityId(null);
    }
  };

  // Send guest message
  const sendGuestMessage = async () => {
    if (!message.trim() || !booking || sendingMessage) return;
    setSendingMessage(true);
    try {
      // Send via email to the org owner
      await supabase.functions.invoke("send-email", {
        body: {
          to: org?.email || "",
          subject: `💬 Message from ${booking.guest_name}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
            <h2 style="color:#1a1a1a;">💬 Guest Message</h2>
            <p style="background:#f5f5f5;padding:16px;border-radius:8px;color:#333;font-size:15px;">${message}</p>
            <p style="color:#888;font-size:13px;margin-top:12px;">From: ${booking.guest_name} (${booking.guest_email})<br/>
            Booking: ${booking.check_in} → ${booking.check_out}<br/>
            Property: ${property?.label || "—"}</p>
            <p style="text-align:center;color:#aaa;font-size:11px;margin-top:24px;">EASY-LOCS®</p>
          </div>`,
        },
      });

      // Create in-app notification for owner
      const { data: orgOwner } = await supabase.from("orgs").select("owner_user_id").eq("id", booking.org_id).single();
      if (orgOwner?.owner_user_id) {
        await (supabase as any).from("app_notifications").insert({
          user_id: orgOwner.owner_user_id,
          scope: "global", category: "guest_message",
          title: `💬 ${booking.guest_name}`,
          body: message.slice(0, 200),
          severity: "info", route: "/dashboard/communication",
        });
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        title: `💬 You`,
        message: message,
        type: "guest",
      }]);
      setMessage("");
      toast.success("Message sent!");
    } catch (err: any) {
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="app-mobile-page bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="app-mobile-page bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">Booking not found</h1>
          <p className="text-muted-foreground text-sm">Please check your booking link or contact your host.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-mobile-page bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
          <AppLogo variant="header" linkTo="/" />
          <PublicLanguageSwitcher locale={locale} supportedLocales={supportedLocales} onChange={changeLocale} />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Booking Hero */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          {property?.photo_urls?.[0] && (
            <div className="aspect-[21/9] bg-muted overflow-hidden">
              <img src={property.photo_urls[0]} alt={property.label} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h1 className="text-xl font-bold text-foreground">{property?.label || "Your Stay"}</h1>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor(booking.status)}`}>
                {booking.status?.replace(/_/g, " ")}
              </span>
            </div>

            {property?.address && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {property.address}, {property.city}
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { icon: CalendarDays, label: "Check-in", value: booking.check_in },
                { icon: CalendarDays, label: "Check-out", value: booking.check_out },
                { icon: Clock, label: "Nights", value: String(nights) },
                { icon: Euro, label: "Total", value: `${booking.total_price || 0}€` },
              ].map(item => (
                <div key={item.label} className="bg-muted/30 rounded-xl p-3 text-center">
                  <item.icon className="h-4 w-4 text-accent mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-semibold text-foreground">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Host contact */}
            {org && (
              <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                {org.logo_url && <img src={org.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{org.brand_name || org.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {org.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{org.email}</span>}
                    {org.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{org.phone}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {[
            { key: "stay" as const, label: "Stay", icon: CalendarDays },
            { key: "services" as const, label: `Services (${services.length})`, icon: Sparkles },
            { key: "activities" as const, label: `Activities (${activities.length})`, icon: ShoppingBag },
            { key: "messages" as const, label: "Messages", icon: MessageSquare },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Stay Details */}
        {tab === "stay" && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border/50 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" /> Guest Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">Name</span><div className="font-medium text-foreground">{booking.guest_name}</div></div>
                <div><span className="text-xs text-muted-foreground">Email</span><div className="text-foreground">{booking.guest_email}</div></div>
              </div>
            </div>

            {property && (
              <div className="bg-card rounded-xl border border-border/50 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" /> Property Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {property.surface && <div><span className="text-xs text-muted-foreground">Surface</span><div className="text-foreground">{property.surface} m²</div></div>}
                  {property.rooms && <div><span className="text-xs text-muted-foreground">Rooms</span><div className="text-foreground">{property.rooms}</div></div>}
                  <div><span className="text-xs text-muted-foreground">Furnished</span><div className="text-foreground">{property.furnished ? "Yes" : "No"}</div></div>
                </div>
              </div>
            )}

            <div className="bg-accent/5 rounded-xl border border-accent/20 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" /> Check-in Instructions
              </h3>
              <p className="text-sm text-muted-foreground">
                Your host will send you detailed check-in instructions before your arrival. Check the Messages tab for updates.
              </p>
            </div>

            {booking.notes && (
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-1">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Services Tab - FUNCTIONAL */}
        {tab === "services" && (
          <div className="space-y-3">
            {services.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border/50">
                <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No services available for this stay</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-xl border border-border/50 p-4 space-y-2 hover:shadow-md transition-shadow">
                    {s.photo_url && (
                      <div className="aspect-[16/9] bg-muted rounded-lg overflow-hidden -mx-1 -mt-1 mb-2">
                        <img src={s.photo_url} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                      <span className="text-sm font-bold text-accent">{s.price}€</span>
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                    {s.duration_minutes && <p className="text-xs text-muted-foreground">⏱ {s.duration_minutes} min</p>}
                    {s.provider_name && <p className="text-xs text-muted-foreground">By: {s.provider_name}</p>}

                    <AnimatePresence mode="wait">
                      {orderSuccess === s.id ? (
                        <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                          className="w-full bg-emerald-500/10 text-emerald-600 text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Requested!
                        </motion.div>
                      ) : (
                        <motion.button key="btn" onClick={() => orderService(s)}
                          disabled={orderingServiceId === s.id}
                          className="w-full bg-accent/10 text-accent text-xs font-medium py-2.5 rounded-lg hover:bg-accent/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                          {orderingServiceId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                          Request Service
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activities Tab - FUNCTIONAL */}
        {tab === "activities" && (
          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border/50">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No activities available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activities.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-md transition-shadow">
                    {a.photo_url && (
                      <div className="aspect-[16/9] bg-muted overflow-hidden">
                        <img src={a.photo_url} alt={a.title} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {(a.badges || []).map((b: string) => (
                          <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium uppercase">{b}</span>
                        ))}
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">{a.title}</h4>
                      {a.description && <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-accent">{a.price}€</span>
                        {a.duration_minutes && <span className="text-xs text-muted-foreground">⏱ {a.duration_minutes} min</span>}
                      </div>

                      <AnimatePresence mode="wait">
                        {orderSuccess === a.id ? (
                          <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full bg-emerald-500/10 text-emerald-600 text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Booked!
                          </motion.div>
                        ) : (
                          <motion.button key="btn" onClick={() => bookActivity(a)}
                            disabled={orderingActivityId === a.id}
                            className="w-full bg-accent/10 text-accent text-xs font-medium py-2.5 rounded-lg hover:bg-accent/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                            {orderingActivityId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                            Book Activity
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Tab - FUNCTIONAL */}
        {tab === "messages" && (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Send a message to your host below</p>
                  </div>
                </div>
              ) : (
                messages.map(m => (
                  <div key={m.id} className={`max-w-[80%] p-3 rounded-xl text-sm ${m.type === "guest" ? "ml-auto bg-accent/10 text-foreground" : "bg-muted/50 text-foreground"}`}>
                    <p className="text-xs text-muted-foreground mb-1">{m.title || "Host"}</p>
                    <p>{m.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border/50 p-3 flex gap-2">
              <input value={message} onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendGuestMessage()}
                placeholder="Type your message to your host..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
              <button onClick={sendGuestMessage} disabled={!message.trim() || sendingMessage}
                className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0 flex items-center gap-1.5">
                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border mt-8">
        Powered by <span className="font-semibold">EASY-LOCS®</span>
      </footer>
    </div>
  );
};

export default GuestPortal;
