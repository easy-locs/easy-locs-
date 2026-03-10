import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FeatureGate from "@/components/subscription/FeatureGate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Mail, Phone,
  CreditCard, FileText, MessageCircle, MapPin, Clock, DollarSign,
  CheckCircle2, XCircle, AlertCircle, Ban, Eye,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths,
  subMonths, addWeeks, subWeeks, isSameMonth, isSameDay, isWithinInterval,
  differenceInDays, parseISO, startOfDay,
} from "date-fns";

/* ─── Types ─── */
interface CalendarEvent {
  id: string;
  title: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  dateFrom: Date;
  dateTo: Date;
  status: string;
  paymentStatus: string;
  price: number;
  currency: string;
  propertyId: string;
  propertyLabel: string;
  source: "seasonal" | "marketplace" | "concierge" | "long_term" | "blocked";
  raw: any;
}

interface PropertyOption {
  id: string;
  label: string;
  country: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  completed: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  pending: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
  cancelled: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
  blocked: "bg-muted text-muted-foreground border-border",
  active: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  awaiting_payment: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
};

const SOURCE_LABELS: Record<string, { label: string; emoji: string }> = {
  seasonal: { label: "Seasonal", emoji: "🏖️" },
  marketplace: { label: "Marketplace", emoji: "🎯" },
  concierge: { label: "Concierge", emoji: "🛎️" },
  long_term: { label: "Long-term", emoji: "🏠" },
  blocked: { label: "Blocked", emoji: "🚫" },
};

type ViewMode = "month" | "week" | "day";

export default function PropertyCalendar() {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const activeCountry = useCountryFilter();
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ propertyId: "", dateFrom: "", dateTo: "", reason: "" });
  const [loading, setLoading] = useState(true);

  // Fetch properties
  useEffect(() => {
    if (!orgId) return;
    const fetch = async () => {
      let q = supabase.from("properties").select("id, label, country").eq("org_id", orgId);
      if (activeCountry) q = q.eq("country", activeCountry);
      const { data } = await q;
      setProperties((data || []) as PropertyOption[]);
    };
    fetch();
  }, [orgId, activeCountry]);

  // Fetch all events
  useEffect(() => {
    if (!orgId) return;
    const fetchEvents = async () => {
      setLoading(true);
      const allEvents: CalendarEvent[] = [];
      const propIds = selectedProperty === "all" ? properties.map(p => p.id) : [selectedProperty];
      if (propIds.length === 0) { setEvents([]); setLoading(false); return; }

      // 1. Seasonal bookings
      if (selectedSource === "all" || selectedSource === "seasonal") {
        const { data: seasonal } = await supabase
          .from("booking_requests")
          .select("*, properties!booking_requests_property_id_fkey(label)")
          .eq("org_id", orgId)
          .in("property_id", propIds);
        (seasonal || []).forEach((b: any) => {
          allEvents.push({
            id: b.id, title: b.guest_name, guestName: b.guest_name,
            guestEmail: b.guest_email, guestPhone: b.guest_phone,
            dateFrom: parseISO(b.check_in), dateTo: parseISO(b.check_out),
            status: b.status, paymentStatus: b.status === "confirmed" ? "paid" : "pending",
            price: 0, currency: "EUR",
            propertyId: b.property_id, propertyLabel: b.properties?.label || "Property",
            source: "seasonal", raw: b,
          });
        });
      }

      // 2. Long-term leases
      if (selectedSource === "all" || selectedSource === "long_term") {
        const { data: leases } = await supabase
          .from("leases")
          .select("*, tenants!leases_tenant_id_fkey(name, email, phone), properties!leases_property_id_fkey(label)")
          .eq("org_id", orgId)
          .in("property_id", propIds);
        (leases || []).forEach((l: any) => {
          allEvents.push({
            id: l.id, title: l.tenants?.name || "Tenant",
            guestName: l.tenants?.name || "", guestEmail: l.tenants?.email || "",
            guestPhone: l.tenants?.phone,
            dateFrom: parseISO(l.start_date),
            dateTo: l.end_date ? parseISO(l.end_date) : addDays(parseISO(l.start_date), 365),
            status: l.status, paymentStatus: l.status === "active" ? "paid" : "pending",
            price: l.rent_amount, currency: "EUR",
            propertyId: l.property_id, propertyLabel: l.properties?.label || "Property",
            source: "long_term", raw: l,
          });
        });
      }

      // 3. Marketplace bookings (that have property_id)
      if (selectedSource === "all" || selectedSource === "marketplace") {
        const { data: mkp } = await supabase
          .from("marketplace_bookings")
          .select("*")
          .eq("org_id", orgId)
          .not("property_id", "is", null);
        (mkp || []).filter((b: any) => propIds.includes(b.property_id)).forEach((b: any) => {
          const from = b.date_from || b.service_date;
          const to = b.date_to || b.date_from || b.service_date;
          if (!from) return;
          allEvents.push({
            id: b.id, title: b.booker_name, guestName: b.booker_name,
            guestEmail: b.booker_email, guestPhone: b.booker_phone,
            dateFrom: parseISO(from), dateTo: parseISO(to),
            status: b.status, paymentStatus: b.payment_confirmed ? "paid" : "pending",
            price: b.total_price || 0, currency: b.currency || "EUR",
            propertyId: b.property_id, propertyLabel: "Property",
            source: "marketplace", raw: b,
          });
        });
      }

      // 4. Concierge orders (that have property_id)
      if (selectedSource === "all" || selectedSource === "concierge") {
        const { data: con } = await supabase
          .from("concierge_orders")
          .select("*")
          .eq("org_id", orgId)
          .not("property_id", "is", null);
        (con || []).filter((b: any) => propIds.includes(b.property_id)).forEach((b: any) => {
          const from = b.service_date;
          const to = b.end_time && /^\d{4}-\d{2}-\d{2}$/.test(b.end_time) ? b.end_time : b.service_date;
          if (!from) return;
          allEvents.push({
            id: b.id, title: b.guest_name, guestName: b.guest_name,
            guestEmail: b.guest_email, guestPhone: b.guest_phone,
            dateFrom: parseISO(from), dateTo: parseISO(to),
            status: b.status, paymentStatus: b.payment_status || "unpaid",
            price: b.total_price, currency: b.currency,
            propertyId: b.property_id, propertyLabel: b.property_label || "Property",
            source: "concierge", raw: b,
          });
        });
      }

      // 5. Blocked dates
      if (selectedSource === "all" || selectedSource === "blocked") {
        const { data: blocked } = await supabase
          .from("property_blocked_dates")
          .select("*, properties!property_blocked_dates_property_id_fkey(label)")
          .eq("org_id", orgId)
          .in("property_id", propIds);
        (blocked || []).forEach((b: any) => {
          allEvents.push({
            id: b.id, title: b.reason || "Blocked",
            guestName: "", guestEmail: "", dateFrom: parseISO(b.date_from),
            dateTo: parseISO(b.date_to), status: "blocked", paymentStatus: "",
            price: 0, currency: "", propertyId: b.property_id,
            propertyLabel: b.properties?.label || "Property", source: "blocked", raw: b,
          });
        });
      }

      setEvents(allEvents);
      setLoading(false);
    };
    fetchEvents();
  }, [orgId, properties, selectedProperty, selectedSource]);

  // Deep-link: auto-open booking
  useEffect(() => {
    const bookingId = searchParams.get("booking");
    if (bookingId && events.length > 0) {
      const ev = events.find(e => e.id === bookingId);
      if (ev) { setSelectedEvent(ev); setDrawerOpen(true); }
      searchParams.delete("booking");
      setSearchParams(searchParams, { replace: true });
    }
  }, [events, searchParams]);

  /* ─── Navigation ─── */
  const navigate = (dir: number) => {
    if (viewMode === "month") setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, dir));
  };

  /* ─── Calendar grid data ─── */
  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      const days: Date[] = [];
      let d = start;
      while (d <= end) { days.push(d); d = addDays(d, 1); }
      return days;
    }
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    return [startOfDay(currentDate)];
  }, [currentDate, viewMode]);

  const getEventsForDay = useCallback((day: Date) => {
    return events.filter(ev => {
      const from = startOfDay(ev.dateFrom);
      const to = startOfDay(ev.dateTo);
      return isWithinInterval(startOfDay(day), { start: from, end: to }) || isSameDay(day, from) || isSameDay(day, to);
    });
  }, [events]);

  /* ─── Block dates ─── */
  const handleBlockDates = async () => {
    if (!blockForm.propertyId || !blockForm.dateFrom || !blockForm.dateTo) return;
    const { error } = await supabase.from("property_blocked_dates").insert({
      org_id: orgId!, property_id: blockForm.propertyId,
      date_from: blockForm.dateFrom, date_to: blockForm.dateTo,
      reason: blockForm.reason || "Blocked by owner",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Dates blocked" });
    setBlockDialogOpen(false);
    setBlockForm({ propertyId: "", dateFrom: "", dateTo: "", reason: "" });
    // Refresh
    window.location.reload();
  };

  const handleUnblock = async (id: string) => {
    await supabase.from("property_blocked_dates").delete().eq("id", id);
    setEvents(prev => prev.filter(e => e.id !== id));
    setDrawerOpen(false);
    toast({ title: "Dates unblocked" });
  };

  /* ─── Header label ─── */
  const headerLabel = viewMode === "month"
    ? format(currentDate, "MMMM yyyy")
    : viewMode === "week"
    ? `${format(calendarDays[0], "MMM d")} — ${format(calendarDays[6] || calendarDays[0], "MMM d, yyyy")}`
    : format(currentDate, "EEEE, MMMM d, yyyy");

  return (
    <DashboardLayout>
      <FeatureGate feature="calendar" featureLabel="Property Calendar">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-accent" /> Property Calendar
              </h1>
              <p className="text-sm text-muted-foreground">Unified view of all bookings and availability</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setBlockDialogOpen(true)}>
              <Ban className="h-4 w-4 mr-1" /> Block Dates
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All properties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All sources" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="seasonal">🏖️ Seasonal</SelectItem>
                <SelectItem value="long_term">🏠 Long-term</SelectItem>
                <SelectItem value="marketplace">🎯 Marketplace</SelectItem>
                <SelectItem value="concierge">🛎️ Concierge</SelectItem>
                <SelectItem value="blocked">🚫 Blocked</SelectItem>
              </SelectContent>
            </Select>

            {/* View mode */}
            <div className="flex bg-muted rounded-lg p-0.5 ml-auto">
              {(["month", "week", "day"] as ViewMode[]).map(v => (
                <Button key={v} size="sm" variant={viewMode === v ? "default" : "ghost"}
                  className="text-xs h-7 px-3 capitalize" onClick={() => setViewMode(v)}>
                  {v}
                </Button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground">{headerLabel}</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>
          ) : viewMode === "month" ? (
            <div className="border border-border rounded-xl overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 bg-muted/50">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2 border-b border-border">{d}</div>
                ))}
              </div>
              {/* Days */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  return (
                    <div key={i}
                      className={`min-h-[90px] sm:min-h-[110px] border-b border-r border-border p-1 cursor-pointer transition-colors hover:bg-muted/30 ${
                        !isCurrentMonth ? "opacity-40" : ""
                      }`}
                      onClick={() => { setCurrentDate(day); setViewMode("day"); }}
                    >
                      <div className={`text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? "bg-accent text-accent-foreground" : "text-foreground"
                      }`}>
                        {format(day, "d")}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 3).map(ev => (
                          <button key={ev.id}
                            className={`w-full text-left text-[10px] sm:text-xs px-1.5 py-0.5 rounded border truncate ${STATUS_COLORS[ev.status] || STATUS_COLORS.pending}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); setDrawerOpen(true); }}
                          >
                            {SOURCE_LABELS[ev.source]?.emoji} {ev.title || ev.guestName}
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === "week" ? (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={i} className="border-r border-border last:border-r-0">
                      <div className={`text-center py-2 border-b border-border ${isToday ? "bg-accent/10" : "bg-muted/30"}`}>
                        <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
                        <div className={`text-sm font-semibold ${isToday ? "text-accent" : "text-foreground"}`}>{format(day, "d")}</div>
                      </div>
                      <div className="min-h-[300px] p-1 space-y-1">
                        {dayEvents.map(ev => (
                          <button key={ev.id}
                            className={`w-full text-left text-xs px-1.5 py-1 rounded border ${STATUS_COLORS[ev.status] || STATUS_COLORS.pending}`}
                            onClick={() => { setSelectedEvent(ev); setDrawerOpen(true); }}
                          >
                            <div className="font-medium truncate">{SOURCE_LABELS[ev.source]?.emoji} {ev.title}</div>
                            {ev.source !== "blocked" && <div className="text-[10px] opacity-75">{ev.price} {ev.currency}</div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Day view */
            <div className="space-y-2">
              {getEventsForDay(currentDate).length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No events on this day</CardContent></Card>
              ) : (
                getEventsForDay(currentDate).map(ev => (
                  <Card key={ev.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => { setSelectedEvent(ev); setDrawerOpen(true); }}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-1.5 h-12 rounded-full ${ev.status === "confirmed" || ev.status === "active" ? "bg-emerald-500" : ev.status === "cancelled" ? "bg-red-500" : ev.status === "blocked" ? "bg-muted-foreground" : "bg-amber-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">{ev.title || ev.guestName || "Blocked"}</span>
                          <Badge variant="outline" className="text-[10px]">{SOURCE_LABELS[ev.source]?.label}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {ev.propertyLabel} · {format(ev.dateFrom, "MMM d")} → {format(ev.dateTo, "MMM d")}
                          {ev.source !== "blocked" && ` · ${ev.price} ${ev.currency}`}
                        </div>
                      </div>
                      <Badge className={`text-xs ${STATUS_COLORS[ev.status] || ""}`}>{ev.status}</Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Bookings", value: events.filter(e => e.source !== "blocked").length, color: "text-accent" },
              { label: "Confirmed", value: events.filter(e => e.status === "confirmed" || e.status === "active").length, color: "text-emerald-600" },
              { label: "Pending", value: events.filter(e => e.status === "pending").length, color: "text-amber-600" },
              { label: "Blocked Days", value: events.filter(e => e.source === "blocked").reduce((sum, e) => sum + Math.max(1, differenceInDays(e.dateTo, e.dateFrom)), 0), color: "text-muted-foreground" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-3 text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ─── Event Detail Drawer ─── */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            {selectedEvent && (
              <>
                <SheetHeader className="pb-4">
                  <SheetTitle className="flex items-center gap-2 flex-wrap">
                    {SOURCE_LABELS[selectedEvent.source]?.emoji} {selectedEvent.source === "blocked" ? "Blocked Period" : "Booking Detail"}
                  </SheetTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={STATUS_COLORS[selectedEvent.status] || ""}>{selectedEvent.status}</Badge>
                    <Badge variant="outline">{SOURCE_LABELS[selectedEvent.source]?.label}</Badge>
                  </div>
                </SheetHeader>

                <div className="space-y-4">
                  {/* Ref */}
                  <div className="text-xs text-muted-foreground">Ref: #{selectedEvent.id.slice(0, 8)}</div>

                  {/* Guest info */}
                  {selectedEvent.source !== "blocked" && (
                    <Card>
                      <CardContent className="pt-4 space-y-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4 text-accent" /> Guest / Tenant</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{selectedEvent.guestName}</p></div>
                          <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium break-all">{selectedEvent.guestEmail}</p></div>
                          {selectedEvent.guestPhone && <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{selectedEvent.guestPhone}</p></div>}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Dates & Property */}
                  <Card>
                    <CardContent className="pt-4 space-y-2">
                      <h3 className="text-sm font-semibold flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-accent" /> Dates & Property</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><p className="text-xs text-muted-foreground">Check-in</p><p className="font-medium">{format(selectedEvent.dateFrom, "PPP")}</p></div>
                        <div><p className="text-xs text-muted-foreground">Check-out</p><p className="font-medium">{format(selectedEvent.dateTo, "PPP")}</p></div>
                        <div><p className="text-xs text-muted-foreground">Duration</p><p className="font-medium">{Math.max(1, differenceInDays(selectedEvent.dateTo, selectedEvent.dateFrom))} days</p></div>
                        <div><p className="text-xs text-muted-foreground">Property</p><p className="font-medium">{selectedEvent.propertyLabel}</p></div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment */}
                  {selectedEvent.source !== "blocked" && (
                    <Card>
                      <CardContent className="pt-4 space-y-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-accent" /> Payment</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold tabular-nums">{Number(selectedEvent.price).toLocaleString()} {selectedEvent.currency}</span>
                          <Badge variant={selectedEvent.paymentStatus === "paid" ? "default" : "outline"}>
                            {selectedEvent.paymentStatus === "paid" ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Paid</> : selectedEvent.paymentStatus}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions */}
                  {selectedEvent.source === "blocked" && (
                    <Button variant="destructive" size="sm" className="w-full" onClick={() => handleUnblock(selectedEvent.id)}>
                      Unblock these dates
                    </Button>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* ─── Block Dates Dialog ─── */}
        <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Block Dates</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Property</Label>
                <Select value={blockForm.propertyId} onValueChange={v => setBlockForm(f => ({ ...f, propertyId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>From</Label><Input type="date" value={blockForm.dateFrom} onChange={e => setBlockForm(f => ({ ...f, dateFrom: e.target.value }))} /></div>
                <div><Label>To</Label><Input type="date" value={blockForm.dateTo} onChange={e => setBlockForm(f => ({ ...f, dateTo: e.target.value }))} /></div>
              </div>
              <div><Label>Reason (optional)</Label><Input value={blockForm.reason} onChange={e => setBlockForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Personal use, maintenance" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleBlockDates}>Block</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </FeatureGate>
    </DashboardLayout>
  );
}
