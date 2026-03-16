/**
 * SellerHubPage — Unified seller management page.
 * Tabs: Dashboard, Videos, Analytics, Live
 * PASS55 Block E2: Seller Deep
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SellerDashboardPanel from "@/components/marketplace/SellerDashboardPanel";
import SellerVideoHub from "@/components/marketplace/SellerVideoHub";
import StorefrontAnalytics from "@/components/marketplace/StorefrontAnalytics";
import LiveCommerceToggle from "@/components/marketplace/LiveCommerceToggle";
import SellerLogisticsPanel from "@/components/delivery/SellerLogisticsPanel";
import { Store, Video, BarChart3, Radio, Truck } from "lucide-react";
import { haptic } from "@/lib/haptics";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Store },
  { id: "logistics", label: "Livraisons", icon: Truck },
  { id: "videos", label: "Vidéos", icon: Video },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "live", label: "Live", icon: Radio },
] as const;

type TabId = typeof TABS[number]["id"];

export default function SellerHubPage() {
  const { user, orgId } = useAuth();
  const [tab, setTab] = useState<TabId>("dashboard");

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

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto pb-6">
        {/* Page header */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-bold text-foreground">Seller Hub</h1>
          <p className="text-xs text-muted-foreground">Gérez votre vitrine, vidéos et performances</p>
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
          {tab === "dashboard" && (
            <SellerDashboardPanel
              provider={provider}
              services={services}
              bookingsCount={bookingsCount}
            />
          )}

          {tab === "videos" && (
            <SellerVideoHub services={services} />
          )}

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
                Créez d'abord votre profil prestataire pour accéder à cette section.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
