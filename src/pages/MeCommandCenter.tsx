/**
 * MeCommandCenter — Intelligent Merchant OS cockpit.
 * Replaces static CustomerProfilePage with:
 * - Smart header with business status
 * - Real-time KPIs
 * - AI Assistant recommendations
 * - Quick actions (1-tap)
 * - Module cards with live state
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitStore } from "@/stores/orbitStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Store, ShoppingBag, QrCode, Receipt, BarChart3,
  Wallet, CreditCard, Building2, Home, Users,
  MessageSquare, Bell, Shield, LogOut, Zap,
  Clock, TrendingUp, Bot, ChevronRight,
  Power, FileEdit, Megaphone, Eye,
  HelpCircle, Truck, Rocket, DollarSign,
  User, Settings, KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══ KPI fetch ═══ */
function useMerchantKpis(userId: string | undefined) {
  return useQuery({
    queryKey: ["me-kpis", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [ordersRes, shopsRes] = await Promise.all([
        (supabase as any)
          .from("orders")
          .select("id,total_amount,status,created_at")
          .gte("created_at", today + "T00:00:00")
          .limit(500),
        (supabase as any)
          .from("storefront_pages")
          .select("id,name,status,is_published")
          .eq("owner_id", userId)
          .limit(20),
      ]);
      const orders = ordersRes?.data ?? [];
      const shops = shopsRes?.data ?? [];
      const revenue = orders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      const activeOrders = orders.filter((o: any) =>
        ["paid", "confirmed", "preparing"].includes(o.status)
      ).length;
      const liveShops = shops.filter((s: any) => s.is_published).length;
      return {
        ordersToday: orders.length,
        revenue: Number(revenue.toFixed(2)),
        activeOrders,
        totalShops: shops.length,
        liveShops,
        conversionRate: orders.length > 0 ? Math.round((activeOrders / Math.max(1, orders.length)) * 100) : 0,
      };
    },
  });
}

/* ═══ AI Suggestions (static for now, will connect to edge function) ═══ */
const AI_SUGGESTIONS = [
  { text: "Activate a promo between 7pm–10pm to boost evening orders", icon: "🎯", action: "promo" },
  { text: "Your store photos reduce conversion — update them", icon: "📸", action: "photos" },
  { text: "QR code not visible on your storefront page", icon: "⚠️", action: "qr" },
  { text: "Underexploited radar zone — boost your visibility", icon: "📡", action: "boost" },
];

/* ═══ Component ═══ */
export default function MeCommandCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = useOrbitStore((s) => s.profile);
  const { data: kpis, isLoading } = useMerchantKpis(user?.id);

  const initials = (profile?.displayName || user?.email || "U")
    .split(/[\s@]/)
    .map((w) => w[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  const businessStatus = kpis?.liveShops && kpis.liveShops > 0 ? "live" : kpis?.totalShops ? "paused" : "setup";
  const statusConfig = {
    live: { label: "Live", color: "bg-emerald-500", textColor: "text-emerald-400" },
    paused: { label: "Paused", color: "bg-amber-500", textColor: "text-amber-400" },
    setup: { label: "Setup needed", color: "bg-muted", textColor: "text-muted-foreground" },
  }[businessStatus];

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] space-y-3">
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
              {profile?.role && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full bg-accent/15 text-accent">
                  {profile.role}
                </span>
              )}
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
          { label: "Revenue", value: kpis?.revenue ? `${kpis.revenue} AED` : "—", icon: <DollarSign className="w-3.5 h-3.5" /> },
          { label: "Active", value: kpis?.activeOrders ?? "—", icon: <Clock className="w-3.5 h-3.5" /> },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border/15 bg-card p-3 text-center">
            <div className="flex justify-center text-primary mb-1">{kpi.icon}</div>
            <p className="text-lg font-bold text-foreground">{isLoading ? "…" : kpi.value}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ── C. AI Assistant ── */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">AI Assistant</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">Smart</span>
        </div>
        <div className="space-y-1.5">
          {AI_SUGGESTIONS.slice(0, 2).map((s, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-xl bg-background/50 active:scale-[0.98] transition-transform">
              <span className="text-sm shrink-0">{s.icon}</span>
              <p className="text-[11px] text-foreground flex-1">{s.text}</p>
              <button className="text-[9px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 shrink-0">
                Fix
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── D. Quick Actions ── */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-foreground px-1">Quick Actions</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <Power className="w-5 h-5" />, label: "Open/Close", path: "/seller/hub", color: "text-emerald-400" },
            { icon: <FileEdit className="w-5 h-5" />, label: "Edit Menu", path: "/seller/products", color: "text-blue-400" },
            { icon: <QrCode className="w-5 h-5" />, label: "QR Code", path: "/merchant/pos", color: "text-violet-400" },
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

      {/* ── E. Module Cards ── */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-foreground px-1">Business Modules</p>

        <ModuleCard
          icon={<Store className="w-5 h-5 text-primary" />}
          title="Storefront"
          subtitle={`${kpis?.liveShops ?? 0} live of ${kpis?.totalShops ?? 0}`}
          badge={kpis?.liveShops ? "Active" : "Setup"}
          badgeColor={kpis?.liveShops ? "emerald" : "amber"}
          onClick={() => navigate("/seller/hub")}
        />
        <ModuleCard
          icon={<QrCode className="w-5 h-5 text-violet-400" />}
          title="POS & QR Payments"
          subtitle="Accept payments instantly"
          badge="Ready"
          badgeColor="emerald"
          onClick={() => navigate("/merchant/pos")}
        />
        <ModuleCard
          icon={<Receipt className="w-5 h-5 text-blue-400" />}
          title="Orders"
          subtitle={`${kpis?.activeOrders ?? 0} active`}
          badge={kpis?.activeOrders ? `${kpis.activeOrders} pending` : "Clear"}
          badgeColor={kpis?.activeOrders ? "amber" : "emerald"}
          onClick={() => navigate("/merchant/orders")}
        />
        <ModuleCard
          icon={<BarChart3 className="w-5 h-5 text-cyan-400" />}
          title="Analytics"
          subtitle="Performance & conversion"
          onClick={() => navigate("/seller/analytics")}
        />
        <ModuleCard
          icon={<Rocket className="w-5 h-5 text-orange-400" />}
          title="Boost & Ads"
          subtitle="Radar & map visibility"
          onClick={() => navigate("/seller/boost")}
        />
        <ModuleCard
          icon={<Truck className="w-5 h-5 text-emerald-400" />}
          title="Delivery"
          subtitle="Drivers & logistics"
          onClick={() => navigate("/dashboard/driver")}
        />
        <ModuleCard
          icon={<Wallet className="w-5 h-5 text-amber-400" />}
          title="Money & Payouts"
          subtitle={`Today: ${kpis?.revenue ?? 0} AED`}
          onClick={() => navigate("/wallet/hub")}
        />
        <ModuleCard
          icon={<Building2 className="w-5 h-5 text-violet-400" />}
          title="Property"
          subtitle="Listings & bookings"
          onClick={() => navigate("/real-estate")}
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
