/**
 * MeCommandCenter — Merchant OS cockpit with multi-shop support.
 * Real-time KPIs, AI assistant, shop switcher, quick actions, module cards.
 */
import { useState } from "react";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitStore } from "@/stores/orbitStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { loadMyShops, getSmartSuggestions, type ShopContext } from "@/lib/merchant/shop-os-engine";
import ShopSwitcher from "@/components/merchant/ShopSwitcher";
import {
  Store, QrCode, Receipt, BarChart3,
  Wallet, Building2,
  Bot, ChevronRight,
  Power, FileEdit, Megaphone, Eye,
  HelpCircle, Truck, Rocket, DollarSign, Activity,
  User, Settings, Shield, Bell, MessageSquare, LogOut, Clock, Zap, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══ KPI fetch ═══ */
function useMerchantKpis(userId: string | undefined, activeShopId?: string) {
  return useQuery({
    queryKey: ["me-kpis", userId, activeShopId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [ordersRes] = await Promise.all([
        (supabase as any)
          .from("orders")
          .select("id,total_amount,status,created_at")
          .gte("created_at", today + "T00:00:00")
          .limit(500),
      ]);
      const orders = ordersRes?.data ?? [];
      const revenue = orders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      const activeOrders = orders.filter((o: any) =>
        ["paid", "confirmed", "preparing"].includes(o.status)
      ).length;
      return {
        ordersToday: orders.length,
        revenue: Number(revenue.toFixed(2)),
        activeOrders,
        conversionRate: orders.length > 0 ? Math.round((activeOrders / Math.max(1, orders.length)) * 100) : 0,
      };
    },
  });
}

/* ═══ Component ═══ */
export default function MeCommandCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = useOrbitStore((s) => s.profile);
  const [activeShopId, setActiveShopId] = useState<string | undefined>();

  const { data: shops, isLoading: shopsLoading } = useQuery({
    queryKey: ["my-shops-os", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: () => loadMyShops(user!.id),
  });

  const { data: kpis, isLoading: kpisLoading } = useMerchantKpis(user?.id, activeShopId);

  const activeShop = shops?.find((s) => s.id === activeShopId) ?? shops?.[0];
  const suggestions = activeShop ? getSmartSuggestions(activeShop) : [];

  const initials = (profile?.displayName || user?.email || "U")
    .split(/[\s@]/)
    .map((w: string) => w[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  const liveShops = shops?.filter((s) => s.isPublished).length ?? 0;
  const totalShops = shops?.length ?? 0;
  const businessStatus = liveShops > 0 ? "live" : totalShops > 0 ? "paused" : "setup";
  const statusConfig = {
    live: { label: "Live", color: "bg-emerald-500", textColor: "text-emerald-400" },
    paused: { label: "Paused", color: "bg-amber-500", textColor: "text-amber-400" },
    setup: { label: "Setup needed", color: "bg-muted", textColor: "text-muted-foreground" },
  }[businessStatus];

  return (
    <div className="app-mobile-page app-mobile-content max-w-md mx-auto px-4 py-4 space-y-3">
      {/* ── A. Smart Header ── */}
      <div className="rounded-2xl border border-border/15 bg-card p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 rounded-2xl border-2 border-primary/30">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg rounded-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground truncate">
              {profile?.displayName || "Your Business"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("flex items-center gap-1 text-[10px] font-bold", statusConfig.textColor)}>
                <span className={cn("w-2 h-2 rounded-full animate-pulse", statusConfig.color)} />
                {statusConfig.label}
              </span>
              <span className="text-[9px] text-muted-foreground">
                {liveShops}/{totalShops} shops live
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 rounded-xl bg-muted text-muted-foreground active:scale-95"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── B. KPI Dashboard ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Orders today", value: kpis?.ordersToday ?? "—", icon: <Receipt className="w-3.5 h-3.5" /> },
          { label: "Revenue", value: kpis?.revenue ? formatMoneyByCountry(kpis.revenue, null, "AED") : "—", icon: <DollarSign className="w-3.5 h-3.5" /> },
          { label: "Active", value: kpis?.activeOrders ?? "—", icon: <Clock className="w-3.5 h-3.5" /> },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border/15 bg-card p-3 text-center">
            <div className="flex justify-center text-primary mb-1">{kpi.icon}</div>
            <p className="text-lg font-bold text-foreground">{kpisLoading ? "…" : kpi.value}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ── C. Multi-Shop Switcher ── */}
      <ShopSwitcher
        shops={shops ?? []}
        activeShopId={activeShop?.id}
        onSelectShop={setActiveShopId}
        loading={shopsLoading}
      />

      {/* ── D. AI Assistant ── */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">AI Assistant</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">Smart</span>
          </div>
          <div className="space-y-1.5">
            {suggestions.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-xl bg-background/50 active:scale-[0.98] transition-transform">
                <span className={cn(
                  "text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5",
                  s.severity === "critical" ? "bg-destructive/15 text-destructive" :
                  s.severity === "warning" ? "bg-amber-500/15 text-amber-400" :
                  "bg-muted text-muted-foreground"
                )}>
                  {s.severity === "critical" ? "!" : s.severity === "warning" ? "⚠" : "ℹ"}
                </span>
                <p className="text-[11px] text-foreground flex-1">{s.message}</p>
                {s.action && (
                  <button
                    onClick={() => s.fixRoute && navigate(s.fixRoute)}
                    className="text-[9px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 shrink-0"
                  >
                    Fix
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── E. Quick Actions ── */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-foreground px-1">Quick Actions</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <Power className="w-5 h-5" />, label: "Open/Close", path: "/seller/hub", color: "text-emerald-400" },
            { icon: <FileEdit className="w-5 h-5" />, label: "Edit Menu", path: "/seller/products", color: "text-blue-400" },
            { icon: <QrCode className="w-5 h-5" />, label: "QR Codes", path: activeShop ? `/merchant/qr/${activeShop.id}` : "/my-shops", color: "text-violet-400" },
            { icon: <Megaphone className="w-5 h-5" />, label: "Promo", path: "/merchant/coupons", color: "text-amber-400" },
            { icon: <Eye className="w-5 h-5" />, label: "Live Orders", path: "/merchant/orders", color: "text-primary" },
            { icon: <Bot className="w-5 h-5" />, label: "AI Chat", path: "/orbit", color: "text-cyan-400" },
            { icon: <Rocket className="w-5 h-5" />, label: "Boost", path: "/seller/boost", color: "text-orange-400" },
            { icon: <HelpCircle className="w-5 h-5" />, label: "Support", path: "/support/tickets", color: "text-muted-foreground" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/10 active:scale-95 transition-transform"
            >
              <span className={a.color}>{a.icon}</span>
              <span className="text-[9px] font-semibold text-muted-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── F. Module Cards — real state, no fakes ── */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-foreground px-1">Business Modules</p>
        <ModuleCard
          icon={<Store className="w-5 h-5 text-primary" />}
          title="Storefront"
          subtitle={totalShops > 0 ? `${liveShops} live of ${totalShops}` : "No shops yet"}
          badge={liveShops > 0 ? "Active" : totalShops > 0 ? "Setup required" : "Not configured"}
          badgeColor={liveShops > 0 ? "emerald" : "amber"}
          onClick={() => navigate("/my-shops")}
        />
        <ModuleCard
          icon={<QrCode className="w-5 h-5 text-violet-400" />}
          title="POS & QR Payments"
          subtitle={activeShop ? "QR auto-generated" : "Create a shop first"}
          badge={activeShop ? "Available" : "Not configured"}
          badgeColor={activeShop ? "emerald" : "amber"}
          onClick={() => navigate(activeShop ? `/merchant/qr/${activeShop.id}` : "/my-shops")}
        />
        <ModuleCard
          icon={<Receipt className="w-5 h-5 text-blue-400" />}
          title="Orders"
          subtitle={kpis?.activeOrders ? `${kpis.activeOrders} active` : "No active orders"}
          badge={kpis?.activeOrders ? `${kpis.activeOrders} pending` : "Clear"}
          badgeColor={kpis?.activeOrders ? "amber" : "emerald"}
          onClick={() => navigate("/merchant/orders")}
        />
        <ModuleCard
          icon={<BarChart3 className="w-5 h-5 text-cyan-400" />}
          title="Analytics"
          subtitle={kpis?.ordersToday ? "Data available" : "Not enough data"}
          badge={kpis?.ordersToday ? "Active" : "No data yet"}
          badgeColor={kpis?.ordersToday ? "emerald" : "amber"}
          onClick={() => navigate("/seller/analytics")}
        />
        <ModuleCard
          icon={<Rocket className="w-5 h-5 text-orange-400" />}
          title="Boost & Ads"
          subtitle="Radar & map visibility"
          badge="Not configured"
          badgeColor="amber"
          onClick={() => navigate("/seller/boost")}
        />
        <ModuleCard
          icon={<Truck className="w-5 h-5 text-emerald-400" />}
          title="Delivery"
          subtitle="Drivers & logistics"
          badge="Not configured"
          badgeColor="amber"
          onClick={() => navigate("/dashboard/driver")}
        />
        <ModuleCard
          icon={<Wallet className="w-5 h-5 text-amber-400" />}
          title="Money & Payouts"
          subtitle={kpis?.revenue ? `Today: ${formatMoneyByCountry(kpis.revenue, null, "AED")}` : "No transactions yet"}
          badge={kpis?.revenue ? "Active" : "No data yet"}
          badgeColor={kpis?.revenue ? "emerald" : "amber"}
          onClick={() => navigate("/wallet/hub")}
        />
        <ModuleCard
          icon={<Building2 className="w-5 h-5 text-violet-400" />}
          title="Property"
          subtitle="Listings & bookings"
          badge="Not configured"
          badgeColor="amber"
          onClick={() => navigate("/browse/real_estate")}
        />
      </div>

      {/* ── Account section ── */}
      <div className="space-y-2 pt-1">
        <p className="text-xs font-bold text-foreground px-1">Account</p>
        {[
          { icon: <User className="w-4 h-4" />, label: "Personal Info", path: "/settings/account" },
          { icon: <Shield className="w-4 h-4" />, label: "Security & Privacy", path: "/settings/security" },
          { icon: <Bell className="w-4 h-4" />, label: "Notifications", path: "/settings/notifications" },
          { icon: <MessageSquare className="w-4 h-4" />, label: "Messages", path: "/orbit" },
          { icon: <Activity className="w-4 h-4" />, label: "Platform Health", path: "/admin/platform-health" },
          { icon: <Settings className="w-4 h-4" />, label: "Garage & Repairs", path: "/admin/garage" },
          { icon: <Eye className="w-4 h-4" />, label: "Menu Quality Control", path: "/admin/menu-quality-control" },
          { icon: <Shield className="w-4 h-4" />, label: "Backend Truth", path: "/admin/backend-truth" },
          { icon: <Zap className="w-4 h-4" />, label: "UX Live Test", path: "/admin/ux-live-test" },
          { icon: <Radio className="w-4 h-4" />, label: "Hyper Radar", path: "/hyper-radar" },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/10 active:scale-[0.98] transition-transform"
          >
            <span className="text-muted-foreground">{item.icon}</span>
            <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* ── Sign Out ── */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-destructive/20 active:scale-[0.98] transition-transform"
      >
        <LogOut className="w-4 h-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">Sign Out</span>
      </button>
    </div>
  );
}

/* ═══ Module Card ═══ */
function ModuleCard({
  icon, title, subtitle, badge, badgeColor, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: "emerald" | "amber" | "red";
  onClick: () => void;
}) {
  const badgeClasses = {
    emerald: "bg-emerald-500/15 text-emerald-400",
    amber: "bg-amber-500/15 text-amber-400",
    red: "bg-red-500/15 text-red-400",
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/10 active:scale-[0.98] transition-transform text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
      {badge && (
        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0", badgeClasses[badgeColor || "emerald"])}>
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}
