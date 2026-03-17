import { useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Calendar, TrendingUp, Users, Home, Plane, PlaneLanding, DollarSign, Sparkles, Clock, CheckCircle2, ShoppingBag } from "lucide-react";
import { format, parseISO, differenceInDays, addDays, isBefore, isAfter } from "date-fns";
// @ts-ignore - isWithinInterval exists at runtime
import { isWithinInterval } from "date-fns";
import { motion } from "framer-motion";

const COLORS = ["hsl(var(--accent))", "hsl(var(--primary))", "hsl(142,71%,45%)", "hsl(45,93%,47%)", "hsl(280,60%,50%)", "hsl(0,84%,60%)"];

const ConciergeOperations = () => {
  const { user } = useAuth();

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

  const { data: properties = [] } = useQuery({
    queryKey: ["props", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, label, city, country").eq("org_id", org!.id);
      return data || [];
    },
    enabled: !!org,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["all_bookings", org?.id],
    queryFn: async () => {
      const [{ data: seasonal }, { data: requests }] = await Promise.all([
        supabase.from("seasonal_bookings" as any).select("*").eq("org_id", org!.id),
        supabase.from("booking_requests").select("*").eq("org_id", org!.id).in("status", ["confirmed", "paid", "approved"]) as any,
      ]);
      const merged: any[] = [];
      const seen = new Set<string>();
      for (const b of [...(seasonal || []), ...(requests || [])] as any[]) {
        const key = `${b.property_id}-${b.check_in}-${b.check_out}-${b.guest_name}`;
        if (!seen.has(key)) { seen.add(key); merged.push(b); }
      }
      return merged;
    },
    enabled: !!org,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["concierge_orders", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("concierge_orders").select("*").eq("org_id", org!.id);
      return data || [];
    },
    enabled: !!org,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("concierge_services").select("*").eq("org_id", org!.id);
      return data || [];
    },
    enabled: !!org,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("booking_tasks").select("*").eq("org_id", org!.id);
      return data || [];
    },
    enabled: !!org,
  });

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  // Arrivals today & next 7 days
  const upcomingArrivals = useMemo(() =>
    bookings.filter(b => {
      try { return b.check_in >= todayStr && b.check_in <= format(addDays(today, 7), "yyyy-MM-dd") && b.status !== "cancelled"; }
      catch { return false; }
    }).sort((a, b) => a.check_in.localeCompare(b.check_in)),
  [bookings, todayStr]);

  // Departures today & next 7 days
  const upcomingDepartures = useMemo(() =>
    bookings.filter(b => {
      try { return b.check_out >= todayStr && b.check_out <= format(addDays(today, 7), "yyyy-MM-dd") && b.status !== "cancelled"; }
      catch { return false; }
    }).sort((a, b) => a.check_out.localeCompare(b.check_out)),
  [bookings, todayStr]);

  // Occupancy rate per property (30-day window)
  const occupancyData = useMemo(() => {
    const windowDays = 30;
    return properties.map(p => {
      const propBookings = bookings.filter(b => b.property_id === p.id && b.status !== "cancelled");
      let occupiedDays = 0;
      for (let i = 0; i < windowDays; i++) {
        const day = addDays(today, i);
        const dayStr = format(day, "yyyy-MM-dd");
        const isOccupied = propBookings.some(b => dayStr >= b.check_in && dayStr < b.check_out);
        if (isOccupied) occupiedDays++;
      }
      return { name: p.label, occupancy: Math.round((occupiedDays / windowDays) * 100), city: p.city };
    });
  }, [properties, bookings]);

  // Revenue per property
  const revenueData = useMemo(() =>
    properties.map(p => {
      const propBookings = bookings.filter(b => b.property_id === p.id && b.status !== "cancelled");
      const bookingRevenue = propBookings.reduce((s, b) => s + (Number(b.total_price) || Number(b.amount) || 0), 0);
      const propOrders = orders.filter(o => o.property_id === p.id && o.payment_status === "paid");
      const serviceRevenue = propOrders.reduce((s, o) => s + Number(o.total_price), 0);
      return { name: p.label, bookings: bookingRevenue, services: serviceRevenue, total: bookingRevenue + serviceRevenue };
    }).filter(d => d.total > 0),
  [properties, bookings, orders]);

  // Service revenue breakdown
  const serviceRevenueData = useMemo(() => {
    const byService = new Map<string, number>();
    for (const o of orders.filter(o => o.payment_status === "paid")) {
      const svc = services.find(s => s.id === o.service_id);
      const name = svc?.title || "Unknown";
      byService.set(name, (byService.get(name) || 0) + Number(o.total_price));
    }
    return Array.from(byService, ([name, value]) => ({ name, value }));
  }, [orders, services]);

  // KPIs
  const totalBookingRevenue = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + (Number(b.total_price) || Number(b.amount) || 0), 0);
  const totalServiceRevenue = orders.filter(o => o.payment_status === "paid").reduce((s, o) => s + Number(o.total_price), 0);
  const avgOccupancy = occupancyData.length > 0 ? Math.round(occupancyData.reduce((s, d) => s + d.occupancy, 0) / occupancyData.length) : 0;
  const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "assigned").length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;

  const propName = (id: string) => properties.find(p => p.id === id)?.label || "—";

  const fmtPrice = (amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    } catch {
      return `${amount.toLocaleString()} €`;
    }
  };

  const kpis = [
    { icon: Home, label: "Occupancy (30d)", value: `${avgOccupancy}%`, cls: "text-accent" },
    { icon: DollarSign, label: "Booking Revenue", value: fmtPrice(totalBookingRevenue), cls: "text-emerald-500" },
    { icon: ShoppingBag, label: "Service Revenue", value: fmtPrice(totalServiceRevenue), cls: "text-blue-500" },
    { icon: Plane, label: "Arrivals (7d)", value: String(upcomingArrivals.length), cls: "text-accent" },
    { icon: PlaneLanding, label: "Departures (7d)", value: String(upcomingDepartures.length), cls: "text-amber-500" },
    { icon: Clock, label: "Pending Tasks", value: String(pendingTasks), cls: "text-orange-500" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" /> Concierge Operations
          </h1>
          <p className="text-sm text-muted-foreground">Real-time overview of your short-term rental & concierge business</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={`h-4 w-4 ${kpi.cls}`} />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                  </div>
                  <p className="text-xl font-bold text-foreground tabular-nums">{kpi.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Arrivals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plane className="h-4 w-4 text-accent" /> Upcoming Arrivals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingArrivals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No arrivals in the next 7 days</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {upcomingArrivals.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">{b.guest_name}</p>
                        <p className="text-xs text-muted-foreground">{propName(b.property_id)}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">{b.check_in}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Departures */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PlaneLanding className="h-4 w-4 text-amber-500" /> Upcoming Departures
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingDepartures.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No departures in the next 7 days</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {upcomingDepartures.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">{b.guest_name}</p>
                        <p className="text-xs text-muted-foreground">{propName(b.property_id)}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">{b.check_out}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Occupancy Chart */}
          {occupancyData.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Occupancy Rate (30 days)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={occupancyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Occupancy"]} />
                    <Bar dataKey="occupancy" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Revenue Chart */}
          {revenueData.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Revenue by Property</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" tickFormatter={v => fmtPrice(v)} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="bookings" stackId="a" fill="hsl(var(--accent))" radius={[0, 0, 0, 0]} name="Bookings" />
                    <Bar dataKey="services" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Services" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Service Revenue Breakdown */}
        {serviceRevenueData.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Service Revenue Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={serviceRevenueData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {serviceRevenueData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [fmtPrice(v)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2">
                  {serviceRevenueData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-foreground">{d.name}</span>
                      <span className="text-muted-foreground font-medium">{fmtPrice(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Orders */}
        {pendingOrders > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-amber-500" /> Pending Orders ({pendingOrders})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {orders.filter(o => o.status === "pending").slice(0, 10).map(o => {
                  const svc = services.find(s => s.id === o.service_id);
                  return (
                    <div key={o.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">{o.guest_name}</p>
                        <p className="text-xs text-muted-foreground">{svc?.title || "Service"} — {propName(o.property_id)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-accent">{fmtPrice(o.total_price)}</p>
                        <Badge variant="outline" className="text-[10px]">{o.payment_status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ConciergeOperations;
