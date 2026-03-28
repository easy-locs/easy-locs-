import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FeatureGate from "@/components/subscription/FeatureGate";
import {
  fetchCalendarProperties,
  fetchSeasonalEvents,
  fetchLeaseEvents,
  fetchMarketplaceEvents,
  fetchConciergeEvents,
  fetchBlockedDates,
  insertBlockedDate,
  deleteBlockedDate,
} from "@/repositories/property-calendar.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useCountryFilter } from "@/hooks/useCountryFilter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Mail, Phone,
  CreditCard, FileText, MessageCircle, MapPin, Clock, DollarSign,
  CheckCircle2, XCircle, AlertCircle, Ban, Eye, ExternalLink,
  Home, ArrowRight, Hash, Globe,
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

/* ─── Source color system (left bar + badge) ─── */
const SOURCE_STYLES: Record<string, { bar: string; bg: string; text: string; border: string }> = {
  seasonal:    { bar: "bg-sky-500",     bg: "bg-sky-500/10",     text: "text-sky-700 dark:text-sky-400",     border: "border-sky-500/20" },
  long_term:   { bar: "bg-violet-500",  bg: "bg-violet-500/10",  text: "text-violet-700 dark:text-violet-400", border: "border-violet-500/20" },
  marketplace: { bar: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/20" },
  concierge:   { bar: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/20" },
  blocked:     { bar: "bg-muted-foreground/50", bg: "bg-muted/50", text: "text-muted-foreground", border: "border-border" },
};

const STATUS_BADGES: Record<string, { className: string; icon: any; label: string }> = {
  confirmed:        { className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25", icon: CheckCircle2, label: "Confirmed" },
  active:           { className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25", icon: CheckCircle2, label: "Active" },
  completed:        { className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25", icon: CheckCircle2, label: "Completed" },
  pending:          { className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25", icon: AlertCircle, label: "Pending" },
  cancelled:        { className: "bg-destructive/15 text-destructive border-destructive/25", icon: XCircle, label: "Cancelled" },
  blocked:          { className: "bg-muted text-muted-foreground border-border", icon: Ban, label: "Blocked" },
  awaiting_payment: { className: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/25", icon: Clock, label: "Awaiting Payment" },
  paid:             { className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25", icon: CheckCircle2, label: "Paid" },
};

const SOURCE_LABELS: Record<string, { label: string; emoji: string }> = {
  seasonal:    { label: "Seasonal",    emoji: "🏖️" },
  marketplace: { label: "Marketplace", emoji: "🎯" },
  concierge:   { label: "Concierge",   emoji: "🛎️" },
  long_term:   { label: "Long-term",   emoji: "🏠" },
  blocked:     { label: "Blocked",     emoji: "🚫" },
};

type ViewMode = "month" | "week" | "day";

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGES[status] || STATUS_BADGES.pending;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.className} gap-1 text-xs border`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
}

function SourceBadge({ source }: { source: string }) {
  const s = SOURCE_STYLES[source] || SOURCE_STYLES.blocked;
  return (
    <Badge variant="outline" className={`${s.bg} ${s.text} ${s.border} gap-1 text-xs border`}>
      {SOURCE_LABELS[source]?.emoji} {SOURCE_LABELS[source]?.label}
    </Badge>
  );
}

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
    fetchCalendarProperties(orgId, activeCountry).then(setProperties);
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
        const seasonal = await fetchSeasonalEvents(orgId, propIds);
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
        const leases = await fetchLeaseEvents(orgId, propIds);
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

      // 3. Marketplace bookings
      if (selectedSource === "all" || selectedSource === "marketplace") {
        const mkp = await fetchMarketplaceEvents(orgId);
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

      // 4. Concierge orders
      if (selectedSource === "all" || selectedSource === "concierge") {
        const con = await fetchConciergeEvents(orgId, propIds);
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
        const blocked = await fetchBlockedDates(orgId, propIds);
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

  // Deep-link
  useEffect(() => {
    const bookingId = searchParams.get("booking");
    if (bookingId && events.length > 0) {
      const ev = events.find(e => e.id === bookingId);
      if (ev) { setSelectedEvent(ev); setDrawerOpen(true); }
      searchParams.delete("booking");
      setSearchParams(searchParams, { replace: true });
    }
  }, [events, searchParams]);

  const navigate = (dir: number) => {
    if (viewMode === "month") setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, dir));
  };

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

  const handleBlockDates = async () => {
    if (!blockForm.propertyId || !blockForm.dateFrom || !blockForm.dateTo) return;
    try {
      await insertBlockedDate({
        org_id: orgId!,
        property_id: blockForm.propertyId,
        date_from: blockForm.dateFrom,
        date_to: blockForm.dateTo,
        reason: blockForm.reason || "Blocked by owner",
      });
      toast({ title: "Dates blocked" });
      setBlockDialogOpen(false);
      setBlockForm({ propertyId: "", dateFrom: "", dateTo: "", reason: "" });
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      await deleteBlockedDate(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      setDrawerOpen(false);
      toast({ title: "Dates unblocked" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const headerLabel = viewMode === "month"
    ? format(currentDate, "MMMM yyyy")
    : viewMode === "week"
    ? `${format(calendarDays[0], "MMM d")} — ${format(calendarDays[6] || calendarDays[0], "MMM d, yyyy")}`
    : format(currentDate, "EEEE, MMMM d, yyyy");

  /* ─── Communication Center link builder ─── */
  const getCommunicationLink = (ev: CalendarEvent) => {
    if (ev.source === "blocked") return null;
    return `/dashboard/communication?search=${encodeURIComponent(ev.guestName || ev.guestEmail)}`;
  };

  /* ─── Event pill for month/week view ─── */
  const EventPill = ({ ev, compact = false }: { ev: CalendarEvent; compact?: boolean }) => {
    const s = SOURCE_STYLES[ev.source] || SOURCE_STYLES.blocked;
    return (
      <button
        className={`w-full text-left flex items-center gap-1 rounded-md border transition-all hover:shadow-sm ${s.bg} ${s.border} ${compact ? "px-1 py-0.5" : "px-1.5 py-1"}`}
        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); setDrawerOpen(true); }}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.bar}`} />
        <span className={`${s.text} truncate ${compact ? "text-[10px]" : "text-xs font-medium"}`}>
          {ev.title || ev.guestName || "Blocked"}
        </span>
      </button>
    );
  };

  return (
    <DashboardLayout>
      <FeatureGate feature="calendar" featureLabel="Property Calendar">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-primary" /> Property Calendar
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
              <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="All properties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All sources" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Source legend */}
            <div className="hidden lg:flex items-center gap-3 ml-2">
              {Object.entries(SOURCE_STYLES).filter(([k]) => k !== "blocked").map(([k, s]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.bar}`} />
                  {SOURCE_LABELS[k]?.label}
                </div>
              ))}
            </div>

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
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-lg font-semibold text-foreground">{headerLabel}</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>
          ) : viewMode === "month" ? (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="grid grid-cols-7 bg-muted/50">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2.5 border-b border-border">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  return (
                    <div key={i}
                      className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border p-1 cursor-pointer transition-colors hover:bg-muted/20 ${
                        !isCurrentMonth ? "opacity-30" : ""
                      }`}
                      onClick={() => { setCurrentDate(day); setViewMode("day"); }}
                    >
                      <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                      }`}>
                        {format(day, "d")}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 3).map(ev => <EventPill key={ev.id} ev={ev} compact />)}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground pl-1 font-medium">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === "week" ? (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={i} className="border-r border-border last:border-r-0">
                      <div className={`text-center py-2.5 border-b border-border ${isToday ? "bg-primary/5" : "bg-muted/30"}`}>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{format(day, "EEE")}</div>
                        <div className={`text-sm font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</div>
                      </div>
                      <div className="min-h-[280px] p-1 space-y-1">
                        {dayEvents.map(ev => <EventPill key={ev.id} ev={ev} />)}
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
                <Card><CardContent className="py-16 text-center text-muted-foreground">
                  <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>No events on this day</p>
                </CardContent></Card>
              ) : (
                getEventsForDay(currentDate).map(ev => {
                  const s = SOURCE_STYLES[ev.source] || SOURCE_STYLES.blocked;
                  const dur = Math.max(1, differenceInDays(ev.dateTo, ev.dateFrom));
                  return (
                    <Card key={ev.id} className="cursor-pointer hover:shadow-md transition-all group"
                      onClick={() => { setSelectedEvent(ev); setDrawerOpen(true); }}>
                      <CardContent className="p-4 flex items-stretch gap-3">
                        <div className={`w-1 rounded-full shrink-0 ${s.bar}`} />
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground truncate">{ev.title || ev.guestName || "Blocked"}</span>
                            <SourceBadge source={ev.source} />
                            <StatusBadge status={ev.status} />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Home className="h-3 w-3" /> {ev.propertyLabel}</span>
                            <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {format(ev.dateFrom, "MMM d")} → {format(ev.dateTo, "MMM d")}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {dur} {dur === 1 ? "day" : "days"}</span>
                            {ev.source !== "blocked" && ev.price > 0 && (
                              <span className="flex items-center gap-1 font-semibold text-foreground"><DollarSign className="h-3 w-3" /> {ev.price.toLocaleString()} {ev.currency}</span>
                            )}
                          </div>
                          {ev.guestEmail && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {ev.guestEmail}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors self-center shrink-0" />
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Bookings", value: events.filter(e => e.source !== "blocked").length, color: "text-primary" },
              { label: "Confirmed", value: events.filter(e => e.status === "confirmed" || e.status === "active").length, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Pending", value: events.filter(e => e.status === "pending").length, color: "text-amber-600 dark:text-amber-400" },
              { label: "Blocked Days", value: events.filter(e => e.source === "blocked").reduce((sum, e) => sum + Math.max(1, differenceInDays(e.dateTo, e.dateFrom)), 0), color: "text-muted-foreground" },
            ].map(s => (
              <Card key={s.label} className="bg-muted/30">
                <CardContent className="p-3 text-center">
                  <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ─── Full Booking Detail Drawer ─── */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            {selectedEvent && (() => {
              const ev = selectedEvent;
              const dur = Math.max(1, differenceInDays(ev.dateTo, ev.dateFrom));
              const commLink = getCommunicationLink(ev);
              return (
                <>
                  <SheetHeader className="pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SourceBadge source={ev.source} />
                      <StatusBadge status={ev.status} />
                    </div>
                    <SheetTitle className="text-xl mt-1">
                      {ev.source === "blocked" ? "Blocked Period" : "Booking Detail"}
                    </SheetTitle>
                  </SheetHeader>

                  <div className="space-y-5 mt-2">
                    {/* Booking reference */}
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Reference:</span>
                      <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono text-foreground">{ev.id.slice(0, 8).toUpperCase()}</code>
                    </div>

                    {/* Guest/Tenant Info */}
                    {ev.source !== "blocked" && (
                      <Card className="border-l-4" style={{ borderLeftColor: `var(--${ev.source === "seasonal" ? "sky" : ev.source === "long_term" ? "violet" : ev.source === "marketplace" ? "amber" : "emerald"}-500, hsl(var(--primary)))` }}>
                        <CardContent className="p-4 space-y-3">
                          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            <User className="h-4 w-4 text-primary" />
                            {ev.source === "long_term" ? "Tenant Information" : "Guest Information"}
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                {(ev.guestName || "?")[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{ev.guestName || "—"}</p>
                                <p className="text-xs text-muted-foreground">{SOURCE_LABELS[ev.source]?.label} booking</p>
                              </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              {ev.guestEmail && (
                                <a href={`mailto:${ev.guestEmail}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                                  <Mail className="h-3.5 w-3.5" /> {ev.guestEmail}
                                </a>
                              )}
                              {ev.guestPhone && (
                                <a href={`tel:${ev.guestPhone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                                  <Phone className="h-3.5 w-3.5" /> {ev.guestPhone}
                                </a>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Dates & Property */}
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                          <CalendarIcon className="h-4 w-4 text-primary" /> Dates & Property
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Check-in</p>
                            <p className="font-semibold text-foreground text-sm mt-0.5">{format(ev.dateFrom, "PPP")}</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Check-out</p>
                            <p className="font-semibold text-foreground text-sm mt-0.5">{format(ev.dateTo, "PPP")}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Duration</span>
                          <span className="font-semibold text-foreground">{dur} {dur === 1 ? "day" : "days"}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Home className="h-3.5 w-3.5" /> Property</span>
                          <span className="font-semibold text-foreground">{ev.propertyLabel}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Globe className="h-3.5 w-3.5" /> Source</span>
                          <SourceBadge source={ev.source} />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Payment */}
                    {ev.source !== "blocked" && (
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            <DollarSign className="h-4 w-4 text-primary" /> Payment
                          </h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-2xl font-bold tabular-nums text-foreground">{Number(ev.price).toLocaleString()}</span>
                              <span className="text-sm text-muted-foreground ml-1">{ev.currency}</span>
                              {ev.source === "long_term" && <span className="text-xs text-muted-foreground ml-1">/month</span>}
                            </div>
                            <StatusBadge status={ev.paymentStatus} />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Quick Actions */}
                    {ev.source !== "blocked" && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {commLink && (
                            <Link to={commLink}>
                              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-9">
                                <MessageCircle className="h-3.5 w-3.5" /> Messages
                              </Button>
                            </Link>
                          )}
                          <Link to="/dashboard/documents">
                            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-9">
                              <FileText className="h-3.5 w-3.5" /> Documents
                            </Button>
                          </Link>
                          {ev.guestEmail && (
                            <a href={`mailto:${ev.guestEmail}`}>
                              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-9">
                                <Mail className="h-3.5 w-3.5" /> Email
                              </Button>
                            </a>
                          )}
                          {ev.guestPhone && (
                            <a href={`tel:${ev.guestPhone}`}>
                              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-9">
                                <Phone className="h-3.5 w-3.5" /> Call
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Unblock */}
                    {ev.source === "blocked" && (
                      <Button variant="destructive" size="sm" className="w-full" onClick={() => handleUnblock(ev.id)}>
                        Unblock these dates
                      </Button>
                    )}
                  </div>
                </>
              );
            })()}
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
