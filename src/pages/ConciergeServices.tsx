import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { computeExchangeRate } from "@/hooks/useCurrencyConversion";
import { useEnsureOrg } from "@/hooks/useEnsureOrg";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import ServicePhotoManager from "@/components/concierge/ServicePhotoManager";
import BookingLinkShare from "@/components/concierge/BookingLinkShare";
import BookingDetailDrawer from "@/components/concierge/BookingDetailDrawer";
import CurrencyWalletWidget from "@/components/dashboard/CurrencyWalletWidget";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit, Sparkles, DollarSign, ShoppingBag, Clock, CheckCircle2,
  XCircle, Link2, Eye, MapPin, CreditCard, Building2, Users, TrendingUp,
  Search, ExternalLink, FileText, MessageCircle, Copy
} from "lucide-react";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";

const SERVICE_CATEGORIES = [
  { value: "transfer", label: "✈️ Airport Transfer" },
  { value: "car_rental", label: "🚗 Car Rental" },
  { value: "yacht", label: "⛵ Yacht Booking" },
  { value: "excursion", label: "🏔️ Excursion" },
  { value: "chef", label: "👨‍🍳 Private Chef" },
  { value: "cleaning", label: "🧹 Cleaning" },
  { value: "babysitting", label: "👶 Babysitting" },
  { value: "vip", label: "🌟 VIP Service" },
  { value: "maintenance", label: "🔧 Maintenance" },
  { value: "laundry", label: "👔 Laundry" },
  { value: "chauffeur", label: "🚘 Chauffeur" },
  { value: "grocery", label: "🛒 Grocery Delivery" },
  { value: "welcome", label: "🎁 Welcome Pack" },
  { value: "spa", label: "🧖 Spa & Wellness" },
  { value: "security", label: "🛡️ Security" },
  { value: "key_handover", label: "🔑 Key Handover" },
  { value: "events", label: "🎉 Events" },
  { value: "other", label: "📦 Other" },
];

const BOOKING_STATUSES: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-500/10 text-amber-600" },
  awaiting_payment: { label: "Awaiting Payment", cls: "bg-orange-500/10 text-orange-600" },
  paid: { label: "Paid", cls: "bg-emerald-500/10 text-emerald-600" },
  confirmed: { label: "Confirmed", cls: "bg-blue-500/10 text-blue-600" },
  in_progress: { label: "In Progress", cls: "bg-accent/10 text-accent" },
  completed: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-600" },
  cancelled: { label: "Cancelled", cls: "bg-destructive/10 text-destructive" },
  refunded: { label: "Refunded", cls: "bg-muted text-muted-foreground" },
};

interface ServiceForm {
  category: string; title: string; description: string; price: number; currency: string;
  duration_minutes: number | null; provider_name: string; provider_phone: string;
  country: string; city: string; active: boolean; photo_urls: string[];
  location: string; conditions: string; booking_type: string;
  payment_methods: string[]; bank_details: any; commission_type: string; commission_amount: number;
  paypal_email: string; booking_slug: string;
  time_slots: { start: string; end: string }[]; blocked_dates: string[];
  requires_id_document: boolean;
}

const emptyForm: ServiceForm = {
  category: "transfer", title: "", description: "", price: 0, currency: "EUR",
  duration_minutes: null, provider_name: "", provider_phone: "", country: "", city: "",
  active: true, photo_urls: [], location: "", conditions: "", booking_type: "instant",
  payment_methods: ["stripe"], bank_details: {}, commission_type: "percentage",
  commission_amount: 0, paypal_email: "", booking_slug: "",
  time_slots: [], blocked_dates: [], requires_id_document: false,
};

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);

/** Format price using Intl based on currency code */
const fmtPrice = (amount: number, currency: string = "EUR") => {
  const cur = (currency || "EUR").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${cur}`;
  }
};

const ConciergeServices = () => {
  const { user, orgId, subscription } = useAuth();
  const { ensureOrg, creating: creatingOrg } = useEnsureOrg();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [tab, setTab] = useState("services");
  const [filterCategory, setFilterCategory] = useState("");
  const [showLinks, setShowLinks] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [landlordProfile, setLandlordProfile] = useState<any>(null);
  const [preferredCurrency, setPreferredCurrency] = useState("EUR");
  const [lastAppliedBookingId, setLastAppliedBookingId] = useState<string | null>(null);

  // Reactive deep-link: auto-open booking from ?booking=ID (works on mount AND subsequent navigations)
  useEffect(() => {
    const bookingId = searchParams.get("booking");
    if (!bookingId || bookingId === lastAppliedBookingId) return;
    if (loading) return; // Wait for data to load
    const found = orders.find((o: any) => String(o.id) === String(bookingId));
    if (found) {
      setTab("bookings");
      setSelectedBooking(found);
      setLastAppliedBookingId(bookingId);
      const next = new URLSearchParams(searchParams);
      next.delete("booking");
      setSearchParams(next, { replace: true });
      console.log("[deep-link] auto-opened concierge booking:", bookingId);
    } else if (!loading) {
      // Data loaded but booking not found — show fallback
      setTab("bookings");
      setLastAppliedBookingId(bookingId);
      const next = new URLSearchParams(searchParams);
      next.delete("booking");
      setSearchParams(next, { replace: true });
      toast.error("Booking not found or no longer available");
      console.warn("[deep-link] concierge booking not found:", bookingId);
    }
  }, [orders, loading, searchParams, lastAppliedBookingId, setSearchParams]);

  // Load landlord profile + preferred currency
  useEffect(() => {
    if (!orgId || !user) return;
    supabase.from("landlord_profiles").select("slug").eq("org_id", orgId).eq("active", true).limit(1).maybeSingle()
      .then(({ data }) => { if (data) setLandlordProfile(data); });
    supabase.from("profiles").select("preferred_currency").eq("id", user.id).single()
      .then(({ data }) => { if (data?.preferred_currency) setPreferredCurrency(data.preferred_currency); });
  }, [orgId, user]);

  const load = useCallback(async () => {
    if (!orgId) return;
    const [{ data: s }, { data: o }] = await Promise.all([
      supabase.from("concierge_services").select("*").eq("org_id", orgId).order("sort_order"),
      supabase.from("concierge_orders").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200),
    ]);
    setServices(s || []);
    setOrders((o || []) as any[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  // Realtime sync for orders
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel('concierge-orders-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'concierge_orders', filter: `org_id=eq.${orgId}` }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, load]);

  const save = async () => {
    const resolvedOrgId = orgId || await ensureOrg();
    if (!resolvedOrgId || !user || !form.title) {
      if (!resolvedOrgId) toast.error("Impossible de créer votre espace. Veuillez vous reconnecter.");
      return;
    }
    const slug = form.booking_slug || generateSlug(form.title);
    const record: any = {
      ...form, org_id: resolvedOrgId, user_id: user.id, booking_slug: slug,
      photo_urls: form.photo_urls, time_slots: form.time_slots,
      blocked_dates: form.blocked_dates, payment_methods: form.payment_methods,
      bank_details: form.bank_details,
    };
    if (editingId) {
      await supabase.from("concierge_services").update(record).eq("id", editingId);
      toast.success(t("page.concierge.service_updated") || "Service updated");
    } else {
      await supabase.from("concierge_services").insert(record);
      toast.success(t("page.concierge.service_created") || "Service created");
    }
    setShowForm(false); setEditingId(null); setForm(emptyForm);
    await load();
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      category: s.category, title: s.title, description: s.description || "",
      price: s.price, currency: s.currency || "EUR", duration_minutes: s.duration_minutes,
      provider_name: s.provider_name || "", provider_phone: s.provider_phone || "",
      country: s.country || "", city: s.city || "", active: s.active,
      photo_urls: Array.isArray(s.photo_urls) ? s.photo_urls : s.photo_url ? [s.photo_url] : [],
      location: s.location || "", conditions: s.conditions || "",
      booking_type: s.booking_type || "instant",
      payment_methods: Array.isArray(s.payment_methods) ? s.payment_methods : ["stripe"],
      bank_details: typeof s.bank_details === "object" ? s.bank_details : {},
      commission_type: s.commission_type || "percentage",
      commission_amount: s.commission_amount || 0,
      paypal_email: s.paypal_email || "",
      booking_slug: s.booking_slug || "",
      time_slots: Array.isArray(s.time_slots) ? s.time_slots : [],
      blocked_dates: Array.isArray(s.blocked_dates) ? s.blocked_dates : [],
      requires_id_document: !!s.requires_id_document,
    });
    setShowForm(true);
  };

  const remove = async (id: string) => {
    await supabase.from("concierge_services").delete().eq("id", id);
    toast.success(t("page.concierge.service_deleted") || "Service deleted");
    await load();
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const updates: any = { status };
    if (status === "confirmed") updates.confirmed_at = new Date().toISOString();
    if (status === "completed") updates.completed_at = new Date().toISOString();
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    if (status === "refunded") updates.refunded_at = new Date().toISOString();
    await supabase.from("concierge_orders").update(updates).eq("id", orderId);
    toast.success(t("page.concierge.order_status_updated") || `Order ${status}`);

    // Resolve related notifications — real action completed
    try {
      const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine");
      await resolveNotificationsForTarget("concierge_order", orderId, user?.id);
    } catch (e) { console.error("[resolve-notif]", e); }

    // Send notification via shared communication pipeline
    const order = orders.find((o: any) => o.id === orderId);
    if (order?.guest_email) {
      const svc = services.find(s => s.id === order.service_id);
      try {
        const { sendCommunicationEvent, createDeepLinkMeta } = await import("@/lib/shared");
        const meta = createDeepLinkMeta({
          targetType: "concierge_order",
          targetId: orderId,
          module: "marketplace",
          countryCode: svc?.country || "",
          bookingId: orderId,
          orgId: order.org_id,
          propertyId: order.property_id,
        });
        await sendCommunicationEvent({
          orgId: order.org_id,
          senderId: user?.id,
          recipientEmail: order.guest_email,
          subject: `Order ${status}: ${svc?.title || "Service"}`,
          message: `Your order for ${svc?.title || "Service"} on ${order.service_date || "—"} has been ${status}. Total: ${order.total_price} ${order.currency || "EUR"}.`,
          category: "booking",
          meta,
        });
      } catch (e) {
        console.error("Status notification error:", e);
      }
    }

    await load();
  };

  const markPaid = async (orderId: string) => {
    await supabase.from("concierge_orders").update({ payment_status: "paid" } as any).eq("id", orderId);
    toast.success(t("page.concierge.payment_confirmed") || "Payment confirmed");

    // Resolve payment notifications — action completed
    try {
      const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine");
      await resolveNotificationsForTarget("concierge_order", orderId, user?.id);
    } catch (e) { console.error("[resolve-notif]", e); }

    await load();
  };

  const catIcon = (cat: string) => SERVICE_CATEGORIES.find(c => c.value === cat)?.label?.split(" ")[0] || "📦";
  const filtered = filterCategory ? services.filter(s => s.category === filterCategory) : services;

  // Filtered orders by search
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter((o: any) => {
      const svc = services.find(s => s.id === o.service_id);
      return (
        (o.guest_name || "").toLowerCase().includes(q) ||
        (o.guest_email || "").toLowerCase().includes(q) ||
        (svc?.title || "").toLowerCase().includes(q) ||
        (o.service_date || "").includes(q) ||
        (o.status || "").toLowerCase().includes(q) ||
        (o.payment_status || "").toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery, services]);

  // KPIs — convert to preferred currency
  const activeServices = services.filter(s => s.active).length;
  const totalRevenue = orders.filter(o => o.payment_status === "paid").reduce((s: number, o: any) => {
    const cur = (o.currency || "EUR").toUpperCase();
    return s + Number(o.total_price || 0) * computeExchangeRate(cur, preferredCurrency);
  }, 0);
  const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "awaiting_payment").length;
  const commissionEarned = orders.filter(o => o.payment_status === "paid").reduce((s: number, o: any) => {
    const cur = (o.currency || "EUR").toUpperCase();
    return s + Number(o.commission_amount || 0) * computeExchangeRate(cur, preferredCurrency);
  }, 0);
  const completedCount = orders.filter(o => o.status === "completed").length;
  const pendingPayments = orders.filter(o => o.payment_status !== "paid" && o.status !== "cancelled").length;

  const handlePreferredCurrencyChange = async (cur: string) => {
    setPreferredCurrency(cur);
    if (user) {
      await supabase.from("profiles").update({ preferred_currency: cur } as any).eq("id", user.id);
    }
  };

  const showcaseUrl = landlordProfile?.slug ? `/showcase/${landlordProfile.slug}` : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {loading && (
          <div className="space-y-6">
            {/* Skeleton KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><CardContent className="pt-4 pb-3 animate-pulse">
                  <div className="h-3 bg-muted rounded w-16 mb-2" />
                  <div className="h-6 bg-muted rounded w-12" />
                </CardContent></Card>
              ))}
            </div>
            {/* Skeleton service cards */}
            <div className="responsive-card-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="aspect-[16/10] bg-muted" />
                  <CardContent className="pt-3 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-5 bg-muted rounded w-20 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        {!loading && (<>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent" /> {t?.("page.concierge.title") || "Concierge Pro"}
            </h1>
            <p className="text-sm text-muted-foreground">{t?.("page.concierge.subtitle") || "Manage services, bookings, payments & commissions"}</p>
          </div>
          <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
            {showcaseUrl && (
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(window.location.origin + showcaseUrl);
                toast.success("Showcase link copied!");
              }}>
                <ExternalLink className="h-4 w-4 mr-1" /> Showcase
              </Button>
            )}
            {showcaseUrl && (
              <Button variant="outline" size="sm" onClick={() => {
                const url = window.location.origin + showcaseUrl;
                window.open(`https://wa.me/?text=${encodeURIComponent("Check out our services: " + url)}`, "_blank");
              }}>
                <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
              </Button>
            )}
            <Button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}>
              <Plus className="h-4 w-4 mr-1" /> {t?.("page.concierge.new_service") || "New Service"}
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { icon: Sparkles, label: t?.("page.concierge.kpi_active") || "Active Services", value: String(activeServices), cls: "text-accent" },
            { icon: ShoppingBag, label: t?.("page.concierge.kpi_pending") || "Pending Orders", value: String(pendingOrders), cls: "text-amber-500" },
            { icon: DollarSign, label: `${t?.("page.concierge.kpi_revenue") || "Revenue"} (${preferredCurrency})`, value: fmtPrice(totalRevenue, preferredCurrency), cls: "text-emerald-500" },
            { icon: TrendingUp, label: `${t?.("page.concierge.kpi_commission") || "Commission"} (${preferredCurrency})`, value: fmtPrice(commissionEarned, preferredCurrency), cls: "text-blue-500" },
            { icon: CheckCircle2, label: t?.("page.concierge.kpi_completed") || "Completed", value: String(completedCount), cls: "text-emerald-500" },
            { icon: CreditCard, label: t?.("page.concierge.kpi_pending_pay") || "Pending Pay", value: String(pendingPayments), cls: "text-orange-500" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="h-full">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <kpi.icon className={`h-4 w-4 shrink-0 ${kpi.cls}`} />
                    <span className="text-2xs text-muted-foreground uppercase tracking-wider truncate">{kpi.label}</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums truncate">{kpi.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="services"><Sparkles className="h-4 w-4 mr-1" />Services ({services.length})</TabsTrigger>
            <TabsTrigger value="bookings"><ShoppingBag className="h-4 w-4 mr-1" />Bookings ({orders.length})</TabsTrigger>
            <TabsTrigger value="revenue"><TrendingUp className="h-4 w-4 mr-1" />Revenue</TabsTrigger>
          </TabsList>

          {/* SERVICES TAB */}
          <TabsContent value="services" className="mt-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <Button size="sm" variant={!filterCategory ? "default" : "outline"} onClick={() => setFilterCategory("")}>All</Button>
              {SERVICE_CATEGORIES.filter(c => services.some(s => s.category === c.value)).map(c => (
                <Button key={c.value} size="sm" variant={filterCategory === c.value ? "default" : "outline"} onClick={() => setFilterCategory(c.value)}>
                  {c.label}
                </Button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No services yet</p>
                <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Create Service</Button>
              </CardContent></Card>
            ) : (
              <div className="responsive-card-grid">
                {filtered.map((s, i) => {
                  const photos: string[] = Array.isArray(s.photo_urls) ? s.photo_urls : s.photo_url ? [s.photo_url] : [];
                  return (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                      <Card className="overflow-hidden group h-full flex flex-col">
                        <div className="aspect-[16/9] overflow-hidden bg-muted relative">
                          {photos.length > 0 ? (
                            <img src={photos[0]} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">{catIcon(s.category)}</div>
                          )}
                          {photos.length > 1 && (
                            <div className="absolute bottom-2 right-2">
                              <Badge variant="secondary" className="text-[10px]">{photos.length} photos</Badge>
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge variant={s.active ? "default" : "outline"} className="text-[10px]">{s.active ? "Active" : "Inactive"}</Badge>
                          </div>
                        </div>
                        <CardContent className="pt-4 space-y-2 flex-1 flex flex-col">
                          <h3 className="font-semibold text-foreground text-sm line-clamp-1">{catIcon(s.category)} {s.title}</h3>
                          {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                          <div className="flex items-center justify-between text-xs mt-auto pt-1">
                            <span className="font-bold text-accent">{fmtPrice(s.price, s.currency)}</span>
                            {s.duration_minutes && <span className="text-muted-foreground"><Clock className="h-3 w-3 inline mr-0.5" />{s.duration_minutes}min</span>}
                          </div>
                          {s.commission_amount > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              Commission: {s.commission_type === "fixed" ? fmtPrice(s.commission_amount, s.currency) : `${s.commission_amount}%`}
                            </p>
                          )}
                          <Separator />
                          <div className="flex items-center gap-1 flex-wrap">
                            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => startEdit(s)}>
                              <Edit className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            {s.booking_slug && (
                              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowLinks(s.id)}>
                                <Link2 className="h-3 w-3 mr-1" /> Share
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => window.open(`/book/${s.booking_slug}`, "_blank")}>
                              <Eye className="h-3 w-3 mr-1" /> Preview
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => remove(s.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings" className="mt-4 space-y-4">
            {/* Search Bar */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guest, service, date, status..."
                className="pl-10"
              />
            </div>

            <Card>
              <CardContent className="pt-4">
                {filteredOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {searchQuery ? "No bookings match your search." : "No bookings yet. Share your service links to get started."}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground">Guest</th>
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground">Service</th>
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground">Date</th>
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground">Amount</th>
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground">Payment</th>
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground">Docs</th>
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground">Status</th>
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredOrders.map((o: any) => {
                          const svc = services.find(s => s.id === o.service_id);
                          const statusInfo = BOOKING_STATUSES[o.status] || BOOKING_STATUSES.pending;
                          const docCount = Array.isArray(o.document_urls) ? o.document_urls.length : 0;
                          return (
                            <tr key={o.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedBooking(o)}>
                              <td className="px-3 py-3">
                                <p className="font-medium text-foreground">{o.guest_name}</p>
                                <p className="text-[10px] text-muted-foreground">{o.guest_email}</p>
                                {o.guest_phone && <p className="text-[10px] text-muted-foreground">{o.guest_phone}</p>}
                              </td>
                              <td className="px-3 py-3 text-muted-foreground text-xs">{svc?.title || "—"}</td>
                              <td className="px-3 py-3 text-xs text-foreground">
                                {o.service_date || "—"}
                                {o.service_time && <span className="text-muted-foreground ml-1">{o.service_time}</span>}
                              </td>
                              <td className="px-3 py-3 font-medium text-foreground">{fmtPrice(o.total_price, o.currency)}</td>
                              <td className="px-3 py-3">
                                <Badge variant="outline" className={`text-[10px] ${o.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                                  {o.payment_status}
                                </Badge>
                                {o.payment_method && (
                                  <span className="text-[9px] text-muted-foreground block mt-0.5">{o.payment_method}</span>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                {docCount > 0 ? (
                                  <Badge variant="outline" className="text-[10px] text-blue-600">
                                    <FileText className="h-3 w-3 mr-0.5" />{docCount}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <Badge className={`text-[10px] ${statusInfo.cls}`}>{statusInfo.label}</Badge>
                              </td>
                              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex flex-wrap gap-1">
                                  <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={() => setSelectedBooking(o)}>
                                    <Eye className="h-3 w-3 mr-0.5" /> View
                                  </Button>
                                  {o.payment_status !== "paid" && o.status !== "cancelled" && (
                                    <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={() => markPaid(o.id)}>
                                      <CreditCard className="h-3 w-3 mr-0.5" /> Paid
                                    </Button>
                                  )}
                                  {o.status === "pending" && (
                                    <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={() => updateOrderStatus(o.id, "confirmed")}>
                                      <CheckCircle2 className="h-3 w-3 mr-0.5" /> Confirm
                                    </Button>
                                  )}
                                  {o.status !== "cancelled" && o.status !== "completed" && (
                                    <Button size="sm" variant="ghost" className="text-[10px] h-6 text-destructive" onClick={() => updateOrderStatus(o.id, "cancelled")}>
                                      <XCircle className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* REVENUE TAB */}
          <TabsContent value="revenue" className="mt-4 space-y-4">
            {/* Currency Wallet */}
            <CurrencyWalletWidget
              orders={orders}
              preferredCurrency={preferredCurrency}
              onPreferredCurrencyChange={handlePreferredCurrencyChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Revenue by Service</CardTitle></CardHeader>
                <CardContent>
                  {services.map(s => {
                    const svcOrders = orders.filter(o => o.service_id === s.id && o.payment_status === "paid");
                    const rev = svcOrders.reduce((sum: number, o: any) => sum + Number(o.total_price || 0), 0);
                    const comm = svcOrders.reduce((sum: number, o: any) => sum + Number(o.commission_amount || 0), 0);
                    if (rev === 0) return null;
                    return (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{catIcon(s.category)} {s.title}</p>
                          <p className="text-[10px] text-muted-foreground">{svcOrders.length} bookings</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{fmtPrice(rev, s.currency)}</p>
                          {comm > 0 && <p className="text-[10px] text-muted-foreground">Commission: {fmtPrice(comm, s.currency)}</p>}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Pending Bank Transfers</CardTitle></CardHeader>
                <CardContent>
                  {orders.filter(o => o.payment_method === "bank_transfer" && o.payment_status !== "paid" && o.status !== "cancelled").length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No pending transfers</p>
                  ) : (
                    orders.filter(o => o.payment_method === "bank_transfer" && o.payment_status !== "paid" && o.status !== "cancelled").map((o: any) => (
                      <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{o.guest_name}</p>
                          <p className="text-[10px] text-muted-foreground">{o.service_date || "—"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{fmtPrice(o.total_price, o.currency)}</span>
                          <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => markPaid(o.id)}>
                            Confirm
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Booking Links Dialog */}
        <Dialog open={!!showLinks} onOpenChange={() => setShowLinks(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Share Booking Link</DialogTitle></DialogHeader>
            {showLinks && (() => {
              const svc = services.find(s => s.id === showLinks);
              return svc?.booking_slug ? (
                <BookingLinkShare serviceSlug={svc.booking_slug} serviceTitle={svc.title} photoUrl={svc.photo_url || (Array.isArray(svc.photo_urls) && svc.photo_urls.length > 0 ? String(svc.photo_urls[0]) : undefined)} shareVersion={svc.updated_at || undefined} />
              ) : <p className="text-muted-foreground text-sm">No booking link configured for this service</p>;
            })()}
          </DialogContent>
        </Dialog>

        {/* Service Form Dialog */}
        <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditingId(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Service" : "New Service"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Photos */}
              {orgId && (
                <ServicePhotoManager
                  photos={form.photo_urls}
                  onChange={(urls) => setForm(f => ({ ...f, photo_urls: urls }))}
                  orgId={orgId}
                  allowVideo={subscription.subscribed}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Category</label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Title *</label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Price</label>
                  <Input type="number" value={form.price || ""} onChange={e => setForm(f => ({ ...f, price: e.target.value === "" ? 0 : Number(e.target.value) }))} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Currency</label>
                  <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["EUR", "USD", "GBP", "CHF", "MAD", "AED", "SAR", "TND"].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Duration (min)</label>
                  <Input type="number" value={form.duration_minutes || ""} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value ? Number(e.target.value) : null }))} />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Location</label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Service location" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Conditions</label>
                <Textarea value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} rows={2} placeholder="Cancellation policy, requirements..." />
              </div>

              <Separator />
              <h3 className="text-sm font-semibold text-foreground">Provider</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Provider Name</label>
                  <Input value={form.provider_name} onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <Input value={form.provider_phone} onChange={e => setForm(f => ({ ...f, provider_phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Country</label>
                  <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">City</label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
              </div>

              <Separator />
              <h3 className="text-sm font-semibold text-foreground">Commission</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <Select value={form.commission_type} onValueChange={v => setForm(f => ({ ...f, commission_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage %</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="none">No Commission</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <Input type="number" value={form.commission_amount || ""} onChange={e => setForm(f => ({ ...f, commission_amount: e.target.value === "" ? 0 : Number(e.target.value) }))} placeholder="0" />
                </div>
              </div>

              <Separator />
              <h3 className="text-sm font-semibold text-foreground">Payment Methods</h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: "stripe", label: "💳 Stripe" },
                  { key: "paypal", label: "🅿️ PayPal" },
                  { key: "bank_transfer", label: "🏦 Bank Transfer" },
                ].map(pm => (
                  <label key={pm.key} className="flex items-center gap-2 text-sm text-foreground">
                    <Switch checked={form.payment_methods.includes(pm.key)}
                      onCheckedChange={checked => setForm(f => ({
                        ...f,
                        payment_methods: checked ? [...f.payment_methods, pm.key] : f.payment_methods.filter(p => p !== pm.key),
                      }))} />
                    {pm.label}
                  </label>
                ))}
              </div>

              {form.payment_methods.includes("bank_transfer") && (
                <div className="space-y-2 bg-muted/30 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-foreground">Bank Details</h4>
                  <Input placeholder="Bank Name" value={form.bank_details.bank_name || ""} onChange={e => setForm(f => ({ ...f, bank_details: { ...f.bank_details, bank_name: e.target.value } }))} />
                  <Input placeholder="IBAN" value={form.bank_details.iban || ""} onChange={e => setForm(f => ({ ...f, bank_details: { ...f.bank_details, iban: e.target.value } }))} />
                  <Input placeholder="SWIFT / BIC" value={form.bank_details.swift || ""} onChange={e => setForm(f => ({ ...f, bank_details: { ...f.bank_details, swift: e.target.value } }))} />
                  <Input placeholder="Account Holder" value={form.bank_details.account_holder || ""} onChange={e => setForm(f => ({ ...f, bank_details: { ...f.bank_details, account_holder: e.target.value } }))} />
                  <Textarea placeholder="Payment instructions" value={form.bank_details.instructions || ""} onChange={e => setForm(f => ({ ...f, bank_details: { ...f.bank_details, instructions: e.target.value } }))} rows={2} />
                </div>
              )}

              {form.payment_methods.includes("paypal") && (
                <div>
                  <label className="text-xs text-muted-foreground">PayPal Email</label>
                  <Input value={form.paypal_email} onChange={e => setForm(f => ({ ...f, paypal_email: e.target.value }))} />
                </div>
              )}

              <Separator />
              <div>
                <label className="text-xs text-muted-foreground">Booking Type</label>
                <Select value={form.booking_type} onValueChange={v => setForm(f => ({ ...f, booking_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant Booking</SelectItem>
                    <SelectItem value="request">Request Booking (manual approval)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <Switch checked={form.requires_id_document} onCheckedChange={checked => setForm(f => ({ ...f, requires_id_document: checked }))} />
                🪪 Require ID document from client
              </label>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <Switch checked={form.active} onCheckedChange={checked => setForm(f => ({ ...f, active: checked }))} />
                Active
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
                <Button onClick={save} disabled={!form.title}>
                  {editingId ? "Update" : "Create"} Service
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Booking Detail Drawer */}
        {orgId && (
          <BookingDetailDrawer
            booking={selectedBooking}
            service={selectedBooking ? services.find(s => s.id === selectedBooking.service_id) : null}
            open={!!selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onUpdate={() => { load(); setSelectedBooking(null); }}
            orgId={orgId}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ConciergeServices;
