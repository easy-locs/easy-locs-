import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { usePublicLocale } from "@/hooks/usePublicLocale";
import PublicLanguageSwitcher from "@/components/public/PublicLanguageSwitcher";
import AppLogo from "@/components/AppLogo";
import { Loader2, CalendarDays, MapPin, Users, Euro, MessageSquare, FileText, Sparkles, Send, CheckCircle2, Clock, CreditCard } from "lucide-react";

const GuestPortal = () => {
  const [params] = useSearchParams();
  const bookingId = params.get("booking");
  const email = params.get("email");
  const { t, setLocale } = useI18n();
  const { locale, changeLocale, supportedLocales } = usePublicLocale();
  const [booking, setBooking] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"stay" | "services" | "activities" | "messages">("stay");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => { setLocale(locale); }, [locale, setLocale]);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) { setNotFound(true); setLoading(false); return; }

      // Try seasonal_bookings first
      const { data: b } = await supabase
        .from("seasonal_bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      if (!b) {
        // Try booking_requests
        const { data: br } = await supabase
          .from("booking_requests")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();
        if (!br) { setNotFound(true); setLoading(false); return; }
        setBooking({ ...br, source: "request" });

        // Load property
        const { data: p } = await supabase.from("properties").select("*").eq("id", br.property_id).maybeSingle();
        setProperty(p);

        // Load services & activities for this org
        const [{ data: svc }, { data: act }] = await Promise.all([
          supabase.from("concierge_services").select("*").eq("org_id", br.org_id).eq("active", true).order("sort_order"),
          supabase.from("activities").select("*").eq("org_id", br.org_id).eq("active", true).order("sort_order"),
        ]);
        setServices(svc || []);
        setActivities(act || []);
        setLoading(false);
        return;
      }

      setBooking({ ...b, source: "seasonal" });

      const [{ data: p }, { data: svc }, { data: act }] = await Promise.all([
        supabase.from("properties").select("*").eq("id", b.property_id).maybeSingle(),
        supabase.from("concierge_services").select("*").eq("org_id", b.org_id).eq("active", true).order("sort_order"),
        supabase.from("activities").select("*").eq("org_id", b.org_id).eq("active", true).order("sort_order"),
      ]);
      setProperty(p);
      setServices(svc || []);
      setActivities(act || []);
      setLoading(false);
    };
    load();
  }, [bookingId]);

  const nights = booking
    ? Math.max(1, Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000))
    : 0;

  const statusColor = (s: string) => {
    if (["confirmed", "paid", "checked_in"].includes(s)) return "bg-success/10 text-success";
    if (["pending", "awaiting_payment", "payment_pending"].includes(s)) return "bg-warning/10 text-warning";
    if (["cancelled", "refunded"].includes(s)) return "bg-destructive/10 text-destructive";
    return "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">Booking not found</h1>
          <p className="text-muted-foreground text-sm">Please check your booking link or contact your host.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <CalendarDays className="h-4 w-4 text-accent mx-auto mb-1" />
                <div className="text-xs text-muted-foreground">Check-in</div>
                <div className="text-sm font-semibold text-foreground">{booking.check_in}</div>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <CalendarDays className="h-4 w-4 text-accent mx-auto mb-1" />
                <div className="text-xs text-muted-foreground">Check-out</div>
                <div className="text-sm font-semibold text-foreground">{booking.check_out}</div>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <Clock className="h-4 w-4 text-accent mx-auto mb-1" />
                <div className="text-xs text-muted-foreground">Nights</div>
                <div className="text-sm font-semibold text-foreground">{nights}</div>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-center">
                <Euro className="h-4 w-4 text-accent mx-auto mb-1" />
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-sm font-semibold text-foreground">{booking.total_price || 0}€</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {[
            { key: "stay" as const, label: "Stay Details", icon: CalendarDays },
            { key: "services" as const, label: `Services (${services.length})`, icon: Sparkles },
            { key: "activities" as const, label: `Activities (${activities.length})`, icon: Sparkles },
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
            {/* Guest Info */}
            <div className="bg-card rounded-xl border border-border/50 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" /> Guest Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">Name</span><div className="font-medium text-foreground">{booking.guest_name}</div></div>
                <div><span className="text-xs text-muted-foreground">Email</span><div className="text-foreground">{booking.guest_email}</div></div>
              </div>
            </div>

            {/* Property Details */}
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

            {/* Check-in Instructions */}
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

        {/* Services Tab */}
        {tab === "services" && (
          <div className="space-y-3">
            {services.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border/50">
                <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No services available for this stay</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map(s => (
                  <div key={s.id} className="bg-card rounded-xl border border-border/50 p-4 space-y-2 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                      <span className="text-sm font-bold text-accent">{s.price}€</span>
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                    {s.duration_minutes && <p className="text-xs text-muted-foreground">⏱ {s.duration_minutes} min</p>}
                    <button className="w-full bg-accent/10 text-accent text-xs font-medium py-2 rounded-lg hover:bg-accent/20 transition-colors flex items-center justify-center gap-1">
                      <CreditCard className="h-3 w-3" /> Request Service
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activities Tab */}
        {tab === "activities" && (
          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border/50">
                <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No activities available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activities.map(a => (
                  <div key={a.id} className="bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-md transition-shadow">
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
                      <button className="w-full bg-accent/10 text-accent text-xs font-medium py-2 rounded-lg hover:bg-accent/20 transition-colors flex items-center justify-center gap-1">
                        <CreditCard className="h-3 w-3" /> Book Activity
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {tab === "messages" && (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Message your host directly</p>
                <p className="text-xs text-muted-foreground mt-1">Sign in or use the contact form below</p>
              </div>
            </div>
            <div className="border-t border-border/50 p-3 flex gap-2">
              <input value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" />
              <button disabled={!message.trim()} className="btn-primary btn-sm shrink-0">
                <Send className="h-4 w-4" />
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
