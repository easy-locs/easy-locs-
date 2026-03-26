/**
 * SellerHubPage — Unified seller management page.
 * Tabs: My Shops, Orders/POS, Logistics, Videos, Analytics, Live
 */
import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Store, Video, BarChart3, Radio, Truck, ChefHat, Loader2 } from "lucide-react";
import { haptic } from "@/lib/haptics";

const SellerDashboard = lazy(() => import("@/components/seller/SellerDashboard"));
const SellerVideoHub = lazy(() => import("@/components/marketplace/SellerVideoHub"));
const StorefrontAnalytics = lazy(() => import("@/components/marketplace/StorefrontAnalytics"));
const LiveCommerceToggle = lazy(() => import("@/components/marketplace/LiveCommerceToggle"));
const SellerLogisticsPanel = lazy(() => import("@/components/delivery/SellerLogisticsPanel"));

const KitchenQueue = lazy(() => import("@/components/pos/KitchenQueue"));

const TABS = [
  { id: "shops", label: "My Shops", icon: Store },
  { id: "orders", label: "Orders", icon: ChefHat },
  { id: "logistics", label: "Deliveries", icon: Truck },
  { id: "videos", label: "Videos", icon: Video },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "live", label: "Live", icon: Radio },
] as const;

type TabId = typeof TABS[number]["id"];

export default function SellerHubPage() {
  const { user, orgId } = useAuth();
  const [tab, setTab] = useState<TabId>("shops");

  const { data: provider } = useQuery({
    queryKey: ["seller_provider", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_providers")
        .select("*")
        .eq("org_id", orgId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!orgId && !!user?.id,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["seller_services", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_services")
        .select("*")
        .eq("org_id", orgId!)
        .order("sort_order");
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: bookingsCount = 0 } = useQuery({
    queryKey: ["seller_bookings_count", orgId],
    queryFn: async () => {
      const { count } = await supabase
        .from("marketplace_bookings")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId!);
      return count || 0;
    },
    enabled: !!orgId,
  });

  // Get first active shop for POS
  const { data: activeShop } = useQuery({
    queryKey: ["seller_active_shop", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name")
        .eq("user_id", user!.id)
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto pb-6">
        {/* Page header */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-bold text-foreground">Seller Hub</h1>
          <p className="text-xs text-muted-foreground">Manage your shops, orders & performance</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-none">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); haptic("selection"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0"
                style={{
                  background: active ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted) / 0.5)",
                  color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  border: `1px solid ${active ? "hsl(var(--primary) / 0.2)" : "transparent"}`,
                }}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="px-4">
          {tab === "shops" && <SellerDashboard />}

          {tab === "orders" && (
            activeShop ? (
              <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
                <KitchenQueue shopId={activeShop.id} />
              </Suspense>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">
                  Activate a shop first to see incoming orders.
                </p>
              </div>
            )
          )}

          {tab === "logistics" && <SellerLogisticsPanel />}

          {tab === "videos" && <SellerVideoHub services={services} />}

          {tab === "analytics" && provider && (
            <StorefrontAnalytics providerId={provider.id} services={services} />
          )}

          {tab === "live" && provider && (
            <LiveCommerceToggle
              providerId={provider.id}
              isLive={provider.is_live || false}
              liveSince={provider.live_since || null}
            />
          )}

          {(tab === "analytics" || tab === "live") && !provider && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                Create a provider profile first to access this section.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
