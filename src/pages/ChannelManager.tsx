import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Calendar, Link2, RefreshCw, Globe, AlertTriangle, CheckCircle2, Plus, Trash2,
  ExternalLink, XCircle, Edit, Mail, TrendingUp, ArrowRight
} from "lucide-react";
import { format, parseISO, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";

const OTA_PLATFORMS = [
  { id: "airbnb", name: "Airbnb", color: "bg-[hsl(350,80%,55%)]", icon: "🏠" },
  { id: "booking", name: "Booking.com", color: "bg-[hsl(220,80%,45%)]", icon: "🅱️" },
  { id: "vrbo", name: "Vrbo", color: "bg-[hsl(200,70%,50%)]", icon: "🏡" },
  { id: "expedia", name: "Expedia", color: "bg-[hsl(45,90%,50%)]", icon: "✈️" },
  { id: "direct", name: "Direct", color: "bg-[hsl(var(--accent))]", icon: "📅" },
];

interface Reservation {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email?: string;
  check_in: string;
  check_out: string;
  status: string;
  ota_provider: string;
  amount: number;
  source_table: "seasonal_bookings" | "booking_requests" | "reservations";
}

const ChannelManager = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [newConn, setNewConn] = useState({ provider: "airbnb", ical_url: "", property_id: "" });
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editModalRes, setEditModalRes] = useState<Reservation | null>(null);
  const [editDates, setEditDates] = useState({ check_in: "", check_out: "" });
  const [selectedTab, setSelectedTab] = useState("calendar");

  // Fetch org
  const { data: org } = useQuery({
    queryKey: ["org", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("org_members").select("org_id").eq("user_id", user!.id).limit(1).single();
      if (!data) return null;
      const { data: o } = await supabase.from("orgs").select("*").eq("id", data.org_id).single();
      return o;
    },
    enabled: !!user,
  });

  // Fetch properties
  const { data: properties = [] } = useQuery({
    queryKey: ["properties", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, label, city, country").eq("org_id", org!.id);
      return data || [];
    },
    enabled: !!org,
  });

  // Fetch OTA connections via RPC
  const { data: connections = [] } = useQuery({
    queryKey: ["ota_connections", org?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_ota_connections", { _org_id: org!.id });
      return (data || []) as Array<{
        id: string; provider: string; status: string; last_sync_at: string | null;
        linked_properties: any; created_at: string;
      }>;
    },
    enabled: !!org,
  });

  // Fetch pricing rules for dynamic pricing indicators
  const { data: pricingRules = [] } = useQuery({
    queryKey: ["pricing_rules", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("pricing_rules").select("*").eq("org_id", org!.id).eq("active", true);
      return data || [];
    },
    enabled: !!org,
  });

  // Fetch all reservations: seasonal_bookings + booking_requests (merged)
  const { data: reservations = [] } = useQuery({
    queryKey: ["channel_reservations", org?.id],
    queryFn: async () => {
      const [{ data: seasonalData }, { data: requestsData }] = await Promise.all([
        supabase.from("seasonal_bookings").select("*").eq("org_id", org!.id),
        supabase.from("booking_requests").select("*").eq("org_id", org!.id),
      ]);

      const seasonal: Reservation[] = (seasonalData || []).map((b: any) => ({
        id: b.id,
        property_id: b.property_id,
        guest_name: b.guest_name,
        guest_email: b.guest_email || "",
        check_in: b.check_in,
        check_out: b.check_out,
        status: b.status || "confirmed",
        ota_provider: "direct",
        amount: Number(b.total_price) || 0,
        source_table: "seasonal_bookings" as const,
      }));

      const requests: Reservation[] = (requestsData || [])
        .filter((r: any) => ["paid", "approved", "confirmed", "pending", "payment_pending"].includes(r.status))
        .map((r: any) => ({
          id: r.id,
          property_id: r.property_id,
          guest_name: r.guest_name,
          guest_email: r.guest_email || "",
          check_in: r.check_in,
          check_out: r.check_out,
          status: r.status,
          ota_provider: "direct",
          amount: 0,
          source_table: "booking_requests" as const,
        }));

      const seen = new Set<string>();
      return [...seasonal, ...requests].filter(r => {
        const key = `${r.property_id}-${r.check_in}-${r.check_out}-${r.guest_name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    enabled: !!org,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["channel_reservations"] });
    qc.invalidateQueries({ queryKey: ["ota_connections"] });
  };

  // Sync iCal
  const syncMut = useMutation({
    mutationFn: async (conn: any) => {
      setSyncingId(conn.id);
      const res = await supabase.functions.invoke("sync-ical", {
        body: {
          ical_url: conn.linked_properties?.[0]?.ical_url || "",
          property_id: conn.linked_properties?.[0]?.property_id || "",
          provider: conn.provider,
          org_id: org!.id,
        },
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Sync terminée : ${data.inserted} nouvelles, ${data.skipped} existantes`);
      invalidateAll();
      setSyncingId(null);
    },
    onError: (err: Error) => { toast.error(err.message); setSyncingId(null); },
  });

  // Add connection
  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ota_connections").insert({
        org_id: org!.id, user_id: user!.id, provider: newConn.provider,
        status: "active", linked_properties: [{ property_id: newConn.property_id, ical_url: newConn.ical_url }],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Connexion OTA ajoutée");
      invalidateAll();
      setAddOpen(false);
      setNewConn({ provider: "airbnb", ical_url: "", property_id: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete connection
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ota_connections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Connexion supprimée"); invalidateAll(); },
  });

  // Cancel reservation with email
  const cancelReservation = async (res: Reservation) => {
    setCancellingId(res.id);
    try {
      if (res.source_table === "seasonal_bookings") {
        await supabase.from("seasonal_bookings").update({ status: "cancelled" } as any).eq("id", res.id);
      } else {
        await supabase.from("booking_requests").update({ status: "cancelled" } as any).eq("id", res.id);
        // Also remove matching seasonal_booking
        if (org?.id) {
          await supabase.from("seasonal_bookings").delete()
            .eq("org_id", org.id).eq("property_id", res.property_id)
            .eq("check_in", res.check_in).eq("check_out", res.check_out)
            .eq("guest_name", res.guest_name);
        }
      }

      // Send cancellation email
      if (res.guest_email) {
        await supabase.functions.invoke("send-email", {
          body: {
            to: res.guest_email,
            subject: `🚫 Réservation annulée — ${res.check_in} → ${res.check_out}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
              <h2 style="color:#dc2626;text-align:center;">🚫 Réservation annulée</h2>
              <p style="color:#555;font-size:15px;text-align:center;">Bonjour ${res.guest_name},<br/>Votre réservation du ${res.check_in} au ${res.check_out} a été annulée.</p>
              <p style="text-align:center;color:#aaa;font-size:11px;margin-top:24px;">EASY-LOCS®</p>
            </div>`,
          },
        });
      }

      // Notify owner
      if (org?.id && user) {
        await supabase.from("notifications").insert({
          user_id: user.id, org_id: org.id, type: "info",
          title: "🚫 Réservation annulée",
          message: `${res.guest_name} — ${res.check_in} → ${res.check_out}`,
          link: "/dashboard/channel-manager",
        });
      }

      toast.success("Réservation annulée et e-mail envoyé");
      invalidateAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  // Modify dates with email
  const modifyDates = async () => {
    if (!editModalRes || !editDates.check_in || !editDates.check_out) return;
    if (editDates.check_out <= editDates.check_in) {
      toast.error("La date de départ doit être après l'arrivée");
      return;
    }

    const oldCheckIn = editModalRes.check_in;
    const oldCheckOut = editModalRes.check_out;

    if (editModalRes.source_table === "seasonal_bookings") {
      await supabase.from("seasonal_bookings").update({
        check_in: editDates.check_in, check_out: editDates.check_out,
      } as any).eq("id", editModalRes.id);
    } else {
      await supabase.from("booking_requests").update({
        check_in: editDates.check_in, check_out: editDates.check_out,
      } as any).eq("id", editModalRes.id);
      // Update matching seasonal_booking
      if (org?.id) {
        await supabase.from("seasonal_bookings").update({
          check_in: editDates.check_in, check_out: editDates.check_out,
        } as any)
          .eq("org_id", org.id).eq("property_id", editModalRes.property_id)
          .eq("check_in", oldCheckIn).eq("check_out", oldCheckOut)
          .eq("guest_name", editModalRes.guest_name);
      }
    }

    // Send modification email
    if (editModalRes.guest_email) {
      await supabase.functions.invoke("send-email", {
        body: {
          to: editModalRes.guest_email,
          subject: `📅 Dates modifiées — ${editDates.check_in} → ${editDates.check_out}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
            <h2 style="color:#1a1a1a;text-align:center;">📅 Dates de réservation modifiées</h2>
            <p style="color:#555;font-size:15px;text-align:center;">Bonjour ${editModalRes.guest_name},<br/>
            Vos nouvelles dates : du <strong>${editDates.check_in}</strong> au <strong>${editDates.check_out}</strong>.</p>
            <p style="text-align:center;color:#aaa;font-size:11px;margin-top:24px;">EASY-LOCS®</p>
          </div>`,
        },
      });
    }

    toast.success("Dates modifiées et e-mail envoyé");
    setEditModalRes(null);
    invalidateAll();
  };

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  const getReservationsForDay = (day: Date) =>
    reservations.filter(r => {
      try {
        return r.status !== "cancelled" && isWithinInterval(day, { start: parseISO(r.check_in), end: parseISO(r.check_out) });
      } catch { return false; }
    });

  // Check if a day has dynamic pricing active
  const getDayPricingAdjustment = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayOfWeek = day.getDay();
    for (const rule of pricingRules) {
      if (rule.rule_type === "seasonal" && rule.start_date && rule.end_date) {
        if (dateStr >= rule.start_date && dateStr <= rule.end_date) {
          return { type: rule.adjustment_type, value: rule.adjustment_value, name: rule.name };
        }
      }
      if (rule.rule_type === "day_of_week" && Array.isArray(rule.days_of_week)) {
        if ((rule.days_of_week as number[]).includes(dayOfWeek)) {
          return { type: rule.adjustment_type, value: rule.adjustment_value, name: rule.name };
        }
      }
    }
    return null;
  };

  const getPlatformInfo = (provider: string) => OTA_PLATFORMS.find(p => p.id === provider) || OTA_PLATFORMS[4];

  const totalRevenue = reservations.filter(r => r.status !== "cancelled").reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const activeConns = connections.filter(c => c.status === "active").length;
  const activeReservations = reservations.filter(r => r.status !== "cancelled");

  const conflicts = useMemo(() => {
    const issues: string[] = [];
    for (const day of calendarDays) {
      const dayRes = getReservationsForDay(day);
      const propMap = new Map<string, string[]>();
      dayRes.forEach(r => {
        const list = propMap.get(r.property_id) || [];
        list.push(r.guest_name);
        propMap.set(r.property_id, list);
      });
      propMap.forEach((guests) => {
        if (guests.length > 1) issues.push(`${format(day, "dd/MM")} — ${guests.join(" vs ")}`);
      });
    }
    return issues;
  }, [calendarDays, reservations]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed": case "paid": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✅ {t("page.common.confirmed") || "Confirmed"}</Badge>;
      case "approved": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">📧 {t("page.common.approved") || "Approved"}</Badge>;
      case "pending": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">🔔 {t("page.common.pending") || "Pending"}</Badge>;
      case "payment_pending": return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">⏳ {t("page.common.payment") || "Payment"}</Badge>;
      case "cancelled": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">🚫 {t("page.common.cancelled") || "Cancelled"}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const propName = (id: string) => properties.find(p => p.id === id)?.label || "—";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Channel Manager</h1>
            <p className="text-muted-foreground text-sm">Calendrier unifié, synchronisation OTA & gestion des réservations</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/seasonal")}>
              <ArrowRight className="h-4 w-4 mr-1" />Locations saisonnières
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/pricing")}>
              <TrendingUp className="h-4 w-4 mr-1" />Dynamic Pricing
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />{t("channel.add_connection") || "Add Connection"}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("channel.new_ota") || "New OTA Connection"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Select value={newConn.provider} onValueChange={v => setNewConn(p => ({ ...p, provider: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OTA_PLATFORMS.filter(p => p.id !== "direct").map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newConn.property_id} onValueChange={v => setNewConn(p => ({ ...p, property_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select a property" /></SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.label} — {p.city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="URL iCal (https://...)" value={newConn.ical_url} onChange={e => setNewConn(p => ({ ...p, ical_url: e.target.value }))} />
                  <Button className="w-full" onClick={() => addMut.mutate()} disabled={!newConn.ical_url || !newConn.property_id || addMut.isPending}>
                    {addMut.isPending ? "Adding..." : "Add"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPIs — Smart clickable synchronized with tab state */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="cursor-pointer hover:shadow-card-hover hover:border-accent/40 transition-all group" onClick={() => setSelectedTab("connections")}>
            <CardContent className="pt-4 pb-3">
               <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">Connections</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums mt-1">{activeConns}</p>
              <p className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View connections →</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-card-hover hover:border-accent/40 transition-all group" onClick={() => setSelectedTab("reservations")}>
            <CardContent className="pt-4 pb-3">
               <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">Reservations</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums mt-1">{activeReservations.length}</p>
              <p className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View reservations →</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-card-hover hover:border-accent/40 transition-all group" onClick={() => navigate("/dashboard/seasonal")}>
            <CardContent className="pt-4 pb-3">
               <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">Revenue</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums mt-1">{totalRevenue.toLocaleString()} €</p>
              <p className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Seasonal rentals →</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer hover:shadow-card-hover hover:border-accent/40 transition-all group ${conflicts.length > 0 ? "border-destructive/50" : ""}`} onClick={() => setSelectedTab("calendar")}>
            <CardContent className="pt-4 pb-3">
               <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">Conflicts</p>
              <p className={`text-xl sm:text-2xl font-bold tabular-nums mt-1 ${conflicts.length > 0 ? "text-destructive" : "text-accent"}`}>{conflicts.length}</p>
              <p className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View calendar →</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-card-hover hover:border-accent/40 transition-all group" onClick={() => navigate("/dashboard/pricing")}>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">Price rules</p>
              <p className="text-xl sm:text-2xl font-bold text-accent tabular-nums mt-1">{pricingRules.length}</p>
              <p className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Dynamic Pricing →</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-1" />Calendar</TabsTrigger>
            <TabsTrigger value="connections"><Link2 className="h-4 w-4 mr-1" />Connections</TabsTrigger>
            <TabsTrigger value="reservations"><Globe className="h-4 w-4 mr-1" />Reservations ({reservations.length})</TabsTrigger>
          </TabsList>

          {/* ─── Calendar Tab ─── */}
          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Calendrier — {format(selectedMonth, "MMMM yyyy")}</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}>←</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedMonth(new Date())}>Today</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}>→</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                  ))}
                  {Array.from({ length: (calendarDays[0]?.getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {calendarDays.map(day => {
                    const dayRes = getReservationsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const pricing = getDayPricingAdjustment(day);
                    return (
                      <div key={day.toISOString()} className={`min-h-[68px] border rounded p-1 relative ${isToday ? "bg-accent/10 border-accent" : "bg-card border-border"}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${isToday ? "text-accent" : "text-foreground"}`}>{day.getDate()}</span>
                          {pricing && (
                            <span className={`text-[8px] font-bold px-1 rounded ${pricing.value > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                              {pricing.value > 0 ? "+" : ""}{pricing.value}{pricing.type === "percentage" ? "%" : "€"}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 mt-0.5">
                          {dayRes.slice(0, 2).map(r => {
                            const plat = getPlatformInfo(r.ota_provider);
                            return (
                              <div key={r.id} className={`text-[9px] text-white px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${plat.color}`}
                                onClick={() => { setEditModalRes(r); setEditDates({ check_in: r.check_in, check_out: r.check_out }); }}>
                                {r.guest_name}
                              </div>
                            );
                          })}
                          {dayRes.length > 2 && <span className="text-[9px] text-muted-foreground">+{dayRes.length - 2}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-4">
                  {OTA_PLATFORMS.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded ${p.color}`} />
                      <span className="text-xs text-muted-foreground">{p.name}</span>
                    </div>
                  ))}
                  {pricingRules.length > 0 && (
                    <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-2">
                      <TrendingUp className="h-3 w-3 text-accent" />
                      <span className="text-xs text-muted-foreground">Dynamic Pricing actif</span>
                    </div>
                  )}
                </div>
                {conflicts.length > 0 && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-semibold text-destructive">Double-bookings detected</span>
                    </div>
                    {conflicts.map((c, i) => (
                      <p key={i} className="text-xs text-destructive/80">{c}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Connections Tab ─── */}
          <TabsContent value="connections" className="mt-4">
            <div className="space-y-4">
              {/* Quick-connect guides */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="border-[hsl(350,80%,55%)]/30 bg-[hsl(350,80%,55%)]/5">
                  <CardContent className="pt-4 pb-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🏠</span>
                      <div>
                        <p className="font-semibold text-foreground">Airbnb</p>
                         <p className="text-[11px] text-muted-foreground">iCal sync</p>
                      </div>
                    </div>
                    <div className="bg-card/80 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
                       <p className="font-medium text-foreground text-sm">📋 How to get the iCal URL:</p>
                      <p>1. Open Airbnb → <strong>Listing</strong> → <strong>Pricing and availability</strong></p>
                      <p>2. Section <strong>"Export calendar"</strong> → Copy the iCal URL</p>
                      <p>3. Paste it in the <strong>"Add a connection"</strong> form</p>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => { setNewConn(p => ({ ...p, provider: "airbnb" })); setAddOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" />Connecter Airbnb
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-[hsl(220,80%,45%)]/30 bg-[hsl(220,80%,45%)]/5">
                  <CardContent className="pt-4 pb-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🅱️</span>
                      <div>
                        <p className="font-semibold text-foreground">Booking.com</p>
                        <p className="text-[11px] text-muted-foreground">iCal sync</p>
                      </div>
                    </div>
                    <div className="bg-card/80 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
                       <p className="font-medium text-foreground text-sm">📋 How to get the iCal URL:</p>
                      <p>1. Open Booking.com Extranet → <strong>Calendar</strong></p>
                      <p>2. Click <strong>"Sync calendars"</strong></p>
                      <p>3. Copy the iCal link and paste it below</p>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => { setNewConn(p => ({ ...p, provider: "booking" })); setAddOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" />Connecter Booking.com
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Existing connections */}
              {connections.length === 0 && (
                <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">
                  No active connections. Use the guides above to sync your Airbnb and Booking.com calendars.
                </CardContent></Card>
              )}
              {connections.map(conn => {
                const plat = getPlatformInfo(conn.provider);
                return (
                  <Card key={conn.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${plat.color} text-white`}>
                          {plat.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{plat.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Last sync: {conn.last_sync_at ? format(parseISO(conn.last_sync_at), "dd/MM/yyyy HH:mm") : "Never"}
                          </p>
                        </div>
                        <Badge variant={conn.status === "active" ? "default" : "secondary"}>
                          {conn.status === "active" ? <><CheckCircle2 className="h-3 w-3 mr-1" />Active</> : conn.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => syncMut.mutate(conn)} disabled={syncingId === conn.id}>
                          <RefreshCw className={`h-4 w-4 mr-1 ${syncingId === conn.id ? "animate-spin" : ""}`} />
                          Sync
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(conn.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ─── Reservations Tab (with cancel/modify/email) ─── */}
          <TabsContent value="reservations" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {reservations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No reservations. Sync your calendars or add manual reservations.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-muted-foreground font-medium">Guest</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Property</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Platform</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Check-in</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Check-out</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">Amount</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.map(r => {
                          const plat = getPlatformInfo(r.ota_provider);
                          const isCancelled = r.status === "cancelled";
                          return (
                            <tr key={r.id} className={`border-b border-border/50 hover:bg-muted/30 ${isCancelled ? "opacity-50" : ""}`}>
                              <td className="py-2">
                                <span className="font-medium text-foreground">{r.guest_name}</span>
                                {r.guest_email && <span className="block text-[10px] text-muted-foreground">{r.guest_email}</span>}
                              </td>
                              <td className="py-2 text-muted-foreground text-xs">{propName(r.property_id)}</td>
                              <td className="py-2"><Badge variant="outline" className="text-xs">{plat.icon} {plat.name}</Badge></td>
                              <td className="py-2 text-muted-foreground">{r.check_in}</td>
                              <td className="py-2 text-muted-foreground">{r.check_out}</td>
                              <td className="py-2">{getStatusBadge(r.status)}</td>
                              <td className="py-2 text-right font-medium text-foreground">{Number(r.amount || 0).toLocaleString()} €</td>
                              <td className="py-2 text-right">
                                {!isCancelled && (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button size="sm" variant="ghost" className="h-7 px-2"
                                      onClick={() => { setEditModalRes(r); setEditDates({ check_in: r.check_in, check_out: r.check_out }); }}>
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive"
                                      disabled={cancellingId === r.id}
                                      onClick={() => { if (confirm(`Cancel the reservation for ${r.guest_name}?`)) cancelReservation(r); }}>
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )}
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
        </Tabs>
      </div>

      {/* ─── Edit Dates Modal ─── */}
      <Dialog open={!!editModalRes} onOpenChange={(open) => { if (!open) setEditModalRes(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit reservation</DialogTitle>
          </DialogHeader>
          {editModalRes && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-foreground">{editModalRes.guest_name}</p>
                <p className="text-xs text-muted-foreground">{propName(editModalRes.property_id)} • {getPlatformInfo(editModalRes.ota_provider).name}</p>
                {editModalRes.guest_email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />{editModalRes.guest_email}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Arrivée</label>
                  <Input type="date" value={editDates.check_in} onChange={e => setEditDates(d => ({ ...d, check_in: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Départ</label>
                  <Input type="date" value={editDates.check_out} onChange={e => setEditDates(d => ({ ...d, check_out: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={modifyDates}>
                  <Mail className="h-4 w-4 mr-1" />Edit & notify
                </Button>
                <Button variant="destructive" onClick={() => { if (confirm(`Cancel the reservation for ${editModalRes.guest_name}?`)) { cancelReservation(editModalRes); setEditModalRes(null); } }}>
                  <XCircle className="h-4 w-4 mr-1" />Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ChannelManager;
