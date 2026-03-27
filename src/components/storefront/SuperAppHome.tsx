/**
 * SuperAppHome — WeChat-inspired services hub.
 * Chat-first super app: Mini-apps grid, quick pay, recent chats, order tracking.
 * Ultra simple, mobile-first, everything connected.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageCircle, Wallet, Store, Truck, ShoppingBag, Scan,
  MapPin, Package, ArrowRight, QrCode, Send, Users,
  Building2, Star, Sparkles, Video, BarChart3, Clock,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useOrbitEngine } from "@/stores/orbit-engine";

/* ═══ Mini-App Grid Item ═══ */
function MiniApp({ to, icon: Icon, label, color, badge }: {
  to: string; icon: React.ElementType; label: string; color: string; badge?: number;
}) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform">
      <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon className="h-5 w-5" style={{ color }} />
        {badge != null && badge > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1"
            style={{ background: "hsl(var(--hud-danger))", color: "#fff" }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium text-center leading-tight" style={{ color: "hsl(var(--hud-text-dim) / 0.8)" }}>
        {label}
      </span>
    </Link>
  );
}

/* ═══ Quick Pay Actions ═══ */
function QuickPayBar() {
  return (
    <div
      className="rounded-2xl p-3 flex items-center justify-around"
      style={{
        background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.08), hsl(var(--primary) / 0.06))",
        border: "1px solid hsl(var(--hud-border) / 0.08)",
      }}
    >
      {[
        { icon: QrCode, label: "Scan", to: "/dashboard/wallet?action=scan" },
        { icon: Send, label: "Pay", to: "/dashboard/wallet?action=pay" },
        { icon: Wallet, label: "Wallet", to: "/dashboard/wallet" },
      ].map(({ icon: Icon, label, to }) => (
        <Link key={label} to={to} className="flex flex-col items-center gap-1 active:scale-90 transition-transform px-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--hud-cyan) / 0.12)" }}>
            <Icon className="h-5 w-5" style={{ color: "hsl(var(--hud-cyan))" }} />
          </div>
          <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-cyan))" }}>{label}</span>
        </Link>
      ))}
    </div>
  );
}

/* ═══ Recent Chat Preview ═══ */
function RecentChats({ threads }: { threads: any[] }) {
  if (!threads.length) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-0.5 mb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
          Recent Chats
        </h3>
        <Link to="/dashboard/communication" className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: "hsl(var(--hud-cyan))" }}>
          All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {threads.slice(0, 3).map((t: any) => (
        <Link
          key={t.id}
          to={`/dashboard/communication?thread=${t.id}`}
          className="flex items-center gap-3 p-2.5 rounded-xl active:scale-[0.98] transition-transform"
          style={{ background: "hsl(var(--hud-surface) / 0.5)" }}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(var(--hud-cyan) / 0.1)" }}>
            <MessageCircle className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
              {t.provider_name || t.listing_title || "Conversation"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {t.context_type === "direct" ? "Direct message" : t.context_type}
            </p>
          </div>
          {t.last_message_at && (
            <span className="text-[9px] shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.35)" }}>
              {new Date(t.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

/* ═══ Active Orders ═══ */
function ActiveOrders({ orders }: { orders: any[] }) {
  if (!orders.length) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-0.5 mb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
          Active Orders
        </h3>
        <Link to="/my-orders" className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: "hsl(var(--hud-cyan))" }}>
          All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {orders.slice(0, 2).map((o: any) => (
        <Link
          key={o.id}
          to={`/my-orders?id=${o.id}`}
          className="flex items-center gap-3 p-2.5 rounded-xl active:scale-[0.98] transition-transform"
          style={{ background: "hsl(var(--hud-surface) / 0.5)" }}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(var(--warning) / 0.1)" }}>
            <Package className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
              #{o.id.slice(0, 8)}
            </p>
            <p className="text-[10px] capitalize" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {o.status}
            </p>
          </div>
          <Clock className="h-3.5 w-3.5" style={{ color: "hsl(var(--warning))" }} />
        </Link>
      ))}
    </div>
  );
}

/* ═══ Main Component ═══ */
export default function SuperAppHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const engine = useOrbitEngine();

  const { data, isLoading } = useQuery({
    queryKey: ["superapp-home-v2", user?.id],
    queryFn: async () => {
      const [threadsRes, ordersRes, shopRes] = await Promise.all([
        (supabase as any).from("conversations_v2")
          .select("id, type, title, updated_at, status")
          .contains("participant_ids", [user!.id])
          .order("updated_at", { ascending: false })
          .limit(5),
        (supabase as any).from("storefront_orders")
          .select("id, status, total, currency, created_at")
          .eq("buyer_id", user!.id)
          .in("status", ["pending", "accepted", "preparing", "shipped"])
          .order("created_at", { ascending: false })
          .limit(3),
        (supabase as any).from("storefront_pages")
          .select("id, name, slug")
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);
      return {
        threads: threadsRes.data || [],
        activeOrders: ordersRes.data || [],
        hasShop: !!shopRes.data,
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (isLoading) return (
    <div className="space-y-4 px-1">
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
      </div>
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );

  const d = data || { threads: [], activeOrders: [], hasShop: false };

  /* Mini-apps grid — the core WeChat-style service launcher */
  const MINI_APPS = [
    { icon: MessageCircle, label: "Chat", to: "/dashboard/communication", color: "hsl(var(--hud-cyan))", badge: engine.unreadMessages },
    { icon: Store, label: "Shops", to: "/shops", color: "hsl(var(--primary))" },
    { icon: Wallet, label: "Pay", to: "/dashboard/wallet", color: "hsl(var(--success))" },
    { icon: ShoppingBag, label: "Orders", to: "/my-orders", color: "hsl(var(--warning))", badge: engine.pendingOrders },
    { icon: Truck, label: "Delivery", to: "/dashboard/driver", color: "hsl(var(--info))" },
    { icon: Scan, label: "POS", to: "/pos", color: "hsl(var(--accent))" },
    { icon: MapPin, label: "Nearby", to: "/radar", color: "hsl(var(--hud-cyan))" },
    { icon: Building2, label: "Property", to: "/property-hub", color: "hsl(var(--primary))" },
  ];

  const EXTRA_APPS = [
    { icon: Users, label: "Contacts", to: "/dashboard/communication?section=contacts", color: "hsl(var(--hud-text-dim) / 0.6)" },
    { icon: BarChart3, label: "Analytics", to: "/dashboard/seller", color: "hsl(var(--hud-text-dim) / 0.6)" },
    { icon: Video, label: "Live", to: "/dashboard/my-shop", color: "hsl(var(--hud-text-dim) / 0.6)" },
    { icon: Sparkles, label: "AI", to: "/dashboard/assistant", color: "hsl(var(--hud-text-dim) / 0.6)" },
  ];

  return (
    <div className="space-y-5 px-1">
      {/* Quick Pay Bar */}
      <QuickPayBar />

      {/* Mini-Apps Grid */}
      <div className="grid grid-cols-4 gap-y-4 gap-x-2">
        {MINI_APPS.map((app) => (
          <MiniApp key={app.label} {...app} />
        ))}
      </div>

      {/* Recent Chats */}
      <RecentChats threads={d.threads} />

      {/* Active Orders */}
      <ActiveOrders orders={d.activeOrders} />

      {/* More Services */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3 px-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
          More Services
        </h3>
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {EXTRA_APPS.map((app) => (
            <MiniApp key={app.label} {...app} />
          ))}
        </div>
      </div>

      {/* Merchant CTA */}
      {!d.hasShop && (
        <Link
          to="/dashboard/my-shop"
          className="block rounded-2xl p-4 active:scale-[0.98] transition-transform"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--hud-cyan) / 0.08))",
            border: "1px solid hsl(var(--hud-border) / 0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.15)" }}>
              <Store className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Start Selling</p>
              <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Create your shop in 2 minutes</p>
            </div>
            <ArrowRight className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
          </div>
        </Link>
      )}
    </div>
  );
}
