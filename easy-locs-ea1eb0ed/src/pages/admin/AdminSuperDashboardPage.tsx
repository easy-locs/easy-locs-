import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/db";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, UtensilsCrossed, Building2, Car, ShoppingCart,
  Briefcase, Users, Loader2, TrendingUp, AlertTriangle, Star,
  ChevronRight, Search, RotateCcw, Settings2, Bot, Send, ListChecks,
  Workflow, Brain,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, lazy, Suspense, Component, type ReactNode } from "react";

const AgentCommandConsole = lazy(() =>
  import("@/components/admin/AgentCommandConsole").then(m => ({ default: m.AgentCommandConsole })),
);
const ExecutionTaskPanel = lazy(() =>
  import("@/components/admin/ExecutionTaskPanel").then(m => ({ default: m.ExecutionTaskPanel })),
);
const WorkflowExecutionPanel = lazy(() =>
  import("@/components/admin/WorkflowExecutionPanel").then(m => ({ default: m.WorkflowExecutionPanel })),
);
const EngineMemoryPanel = lazy(() =>
  import("@/pages/admin/EngineMemoryPanel").then(m => ({ default: m.EngineMemoryPanel })),
);

class PanelErrorBoundary extends Component<
  { name: string; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("[AutonomousAgents]", this.props.name, error); }
  render() {
    if (this.state.error) {
      return (
        <AppCard className="border-destructive/40">
          <CardContent className="p-3 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{this.props.name} failed to load</p>
              <p className="font-mono break-words mt-1">{this.state.error.message}</p>
            </div>
          </CardContent>
        </AppCard>
      );
    }
    return this.props.children;
  }
}

function PanelFallback({ label }: { label: string }) {
  return (
    <AppCard>
      <CardContent className="p-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading {label}…
      </CardContent>
    </AppCard>
  );
}

function AgentSubHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
      <div className="min-w-0">
        <h4 className="text-sm font-bold leading-tight">{title}</h4>
        <p className="text-[0.6875rem] text-muted-foreground leading-tight mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

interface VerticalKpi {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  metric1Label: string;
  metric1Value: number;
  metric2Label: string;
  metric2Value: number | string;
  link: string;
}

export default function AdminSuperDashboardPage() {
  const [providerSearch, setProviderSearch] = useState("");
  const [providerTypeFilter, setProviderTypeFilter] = useState("all");

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["admin-super-kpis"],
    queryFn: async () => {
      const [foodRes, hotelRes, taxiRes, commerceRes, servicesRes] = await Promise.all([
        db.from("storefront_orders").select("id", { count: "exact" }).in("status", ["pending", "preparing", "ready_for_pickup"]),
        db.from("service_bookings_v2").select("id", { count: "exact" }).eq("booked_date", new Date().toISOString().split("T")[0]),
        db.from("storefront_orders").select("id", { count: "exact" }).eq("status", "pending"),
        db.from("storefront_orders").select("id", { count: "exact" }).eq("status", "pending"),
        db.from("service_bookings_v2").select("id", { count: "exact" }).eq("booked_date", new Date().toISOString().split("T")[0]).not("status", "in", '("cancelled_by_client","cancelled_by_provider","rejected")'),
      ]);

      return {
        food: { active: foodRes.count || 0 },
        hotel: { checkins: hotelRes.count || 0 },
        taxi: { active: taxiRes.count || 0 },
        commerce: { pending: commerceRes.count || 0 },
        services: { today: servicesRes.count || 0 },
      };
    },
    refetchInterval: 30000,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ["admin-providers", providerTypeFilter, providerSearch],
    queryFn: async () => {
      let query = db.from("providers").select("*").order("created_at", { ascending: false }).limit(50);
      if (providerTypeFilter !== "all") query = query.eq("provider_type", providerTypeFilter);
      if (providerSearch.trim()) query = query.ilike("display_name", `%${providerSearch}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  const { data: pendingReturns = [] } = useQuery({
    queryKey: ["admin-pending-returns"],
    queryFn: async () => {
      const { data } = await db.from("product_returns").select("*, storefront_orders(total, currency)").eq("status", "requested").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const { data } = await db.from("platform_config").select("value").eq("key", "commissions").single();
      return data?.value || { food: 15, hotel: 12, taxi: 20, commerce: 10, services: 18 };
    },
  });

  const verticalCards: VerticalKpi[] = [
    { label: "Food", icon: UtensilsCrossed, color: "text-orange-500", metric1Label: "Active Orders", metric1Value: kpis?.food?.active || 0, metric2Label: "Commission", metric2Value: `${commissions?.food || 15}%`, link: "/admin/ops-dashboard" },
    { label: "Hotel", icon: Building2, color: "text-blue-500", metric1Label: "Check-ins Today", metric1Value: kpis?.hotel?.checkins || 0, metric2Label: "Commission", metric2Value: `${commissions?.hotel || 12}%`, link: "/admin/ops-dashboard" },
    { label: "Taxi", icon: Car, color: "text-yellow-500", metric1Label: "Active Rides", metric1Value: kpis?.taxi?.active || 0, metric2Label: "Commission", metric2Value: `${commissions?.taxi || 20}%`, link: "/admin/driver-monitor" },
    { label: "Commerce", icon: ShoppingCart, color: "text-green-500", metric1Label: "Pending Orders", metric1Value: kpis?.commerce?.pending || 0, metric2Label: "Commission", metric2Value: `${commissions?.commerce || 10}%`, link: "/admin/order-watch" },
    { label: "Services", icon: Briefcase, color: "text-purple-500", metric1Label: "Today's Bookings", metric1Value: kpis?.services?.today || 0, metric2Label: "Commission", metric2Value: `${commissions?.services || 18}%`, link: "/admin/ops-dashboard" },
  ];

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Super Dashboard" icon={<LayoutDashboard className="h-5 w-5 text-primary" />} backTo="/admin/master" />
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-6">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {verticalCards.map(v => (
                <Link key={v.label} to={v.link}>
                  <AppCard className="hover:border-primary/30 transition-colors cursor-pointer">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <v.icon className={`h-5 w-5 ${v.color}`} />
                        <span className="text-xs font-bold">{v.label}</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{v.metric1Value}</p>
                        <p className="text-[0.625rem] text-muted-foreground">{v.metric1Label}</p>
                      </div>
                      <Badge variant="outline" className="text-[0.625rem]">{v.metric2Value}</Badge>
                    </CardContent>
                  </AppCard>
                </Link>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4" /> Providers
                </h3>
              </div>
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search..." className="pl-9 h-8 text-xs" value={providerSearch} onChange={e => setProviderSearch(e.target.value)} />
                </div>
                <Select value={providerTypeFilter} onValueChange={setProviderTypeFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="taxi_driver">Taxi</SelectItem>
                    <SelectItem value="delivery_driver">Delivery</SelectItem>
                    <SelectItem value="service_provider">Services</SelectItem>
                    <SelectItem value="commerce">Commerce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 font-medium">Name</th>
                      <th className="text-left p-2 font-medium">Type</th>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((p: any) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="p-2 font-medium">{p.display_name || p.business_name || "—"}</td>
                        <td className="p-2"><Badge variant="outline" className="text-[0.5625rem]">{p.provider_type || "—"}</Badge></td>
                        <td className="p-2">
                          <Badge className={`text-[0.5625rem] ${p.kyc_status === "verified" ? "bg-green-100 text-green-800" : p.kyc_status === "pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                            {p.kyc_status || "—"}
                          </Badge>
                        </td>
                        <td className="p-2 flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {p.rating?.toFixed(1) || "—"}
                        </td>
                      </tr>
                    ))}
                    {providers.length === 0 && (
                      <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No providers found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {pendingReturns.length > 0 && (
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                  <RotateCcw className="h-4 w-4" /> Pending Returns ({pendingReturns.length})
                </h3>
                <div className="space-y-2">
                  {pendingReturns.map((ret: any) => (
                    <AppCard key={ret.id}>
                      <CardContent className="p-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-mono">#{ret.id.slice(0, 8)}</p>
                          <p className="text-[0.625rem] text-muted-foreground">{ret.reason} — {ret.storefront_orders?.total || 0} {ret.storefront_orders?.currency || "AED"}</p>
                        </div>
                        <Badge className="text-[0.625rem] bg-amber-100 text-amber-800">Pending</Badge>
                      </CardContent>
                    </AppCard>
                  ))}
                </div>
              </div>
            )}

            {commissions && (
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                  <Settings2 className="h-4 w-4" /> Commission Rates
                </h3>
                <div className="border rounded-lg divide-y">
                  {Object.entries(commissions).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs capitalize">{key}</span>
                      <span className="text-xs font-bold">{String(val)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <section aria-labelledby="autonomous-agents-heading" className="space-y-5 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2 pt-4">
                <Bot className="w-5 h-5 text-primary" />
                <h2 id="autonomous-agents-heading" className="text-base font-bold">
                  Autonomous Agents
                </h2>
                <Badge variant="outline" className="text-[0.625rem]">live</Badge>
              </div>
              <p className="text-[0.6875rem] text-muted-foreground -mt-3">
                Live wiring of the autonomous agent runtime — dispatch, execution, workflows, and learned-fix memory — bound to Supabase.
              </p>

              <div>
                <AgentSubHeader
                  icon={Send}
                  title="Agent Command Console"
                  subtitle="Dispatch structured tasks (SAFE / MEDIUM / CRITICAL) and watch their live state."
                />
                <PanelErrorBoundary name="Agent Command Console">
                  <Suspense fallback={<PanelFallback label="command console" />}>
                    <AgentCommandConsole />
                  </Suspense>
                </PanelErrorBoundary>
              </div>

              <div>
                <AgentSubHeader
                  icon={ListChecks}
                  title="Execution Tasks"
                  subtitle="Live feed of system.execution_tasks with timeline, logs, and authorized retries."
                />
                <PanelErrorBoundary name="Execution Task Panel">
                  <Suspense fallback={<PanelFallback label="execution tasks" />}>
                    <ExecutionTaskPanel />
                  </Suspense>
                </PanelErrorBoundary>
              </div>

              <div>
                <AgentSubHeader
                  icon={Workflow}
                  title="Workflow Executions"
                  subtitle="Registered automation workflows and their recent execution history."
                />
                <PanelErrorBoundary name="Workflow Execution Panel">
                  <Suspense fallback={<PanelFallback label="workflow executions" />}>
                    <WorkflowExecutionPanel />
                  </Suspense>
                </PanelErrorBoundary>
              </div>

              <div>
                <AgentSubHeader
                  icon={Brain}
                  title="Engine Memory"
                  subtitle="Learned fixes, recurrence tracking, and the learning engine's performance."
                />
                <PanelErrorBoundary name="Engine Memory Panel">
                  <Suspense fallback={<PanelFallback label="engine memory" />}>
                    <EngineMemoryPanel />
                  </Suspense>
                </PanelErrorBoundary>
              </div>
            </section>
          </>
        )}
      </div>
    </SubPageShell>
  );
}
