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
  ChevronRight, Search, RotateCcw, Settings2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

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
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
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
          </>
        )}
      </div>
    </SubPageShell>
  );
}
