/**
 * SellerDashboardPanel — Provider analytics & quick actions
 * Shows storefront stats, service performance, and quick links.
 * PASS55 Block E: Seller/Video/Live
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Store, Eye, Star, ShoppingCart, TrendingUp, ExternalLink,
  Plus, Settings, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

interface SellerDashboardPanelProps {
  provider: {
    id: string;
    display_name: string;
    slug?: string;
    rating?: number;
    reviews_count?: number;
    completed_jobs?: number;
    active?: boolean;
    is_live?: boolean;
  } | null;
  services: any[];
  bookingsCount?: number;
  totalRevenue?: number;
  currency?: string;
}

export default function SellerDashboardPanel({
  provider,
  services,
  bookingsCount = 0,
  totalRevenue = 0,
  currency = "EUR",
}: SellerDashboardPanelProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);

  const stats = [
    {
      icon: Store,
      label: t("mp.active_services") || "Active Services",
      value: activeServices.length.toString(),
      color: "hsl(var(--primary))",
    },
    {
      icon: ShoppingCart,
      label: t("mp.total_bookings") || "Bookings",
      value: bookingsCount.toString(),
      color: "hsl(var(--accent))",
    },
    {
      icon: Star,
      label: t("mp.rating") || "Rating",
      value: provider?.rating ? `${provider.rating}/5` : "—",
      color: "hsl(38 92% 50%)",
    },
    {
      icon: TrendingUp,
      label: t("mp.revenue") || "Revenue",
      value: totalRevenue > 0 ? `${totalRevenue.toLocaleString()} ${currency}` : "—",
      color: "hsl(var(--success, 142 76% 36%))",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-3 space-y-1"
          >
            <div className="flex items-center gap-2">
              <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
              <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("mp.quick_actions") || "Quick Actions"}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 justify-start"
            onClick={() => navigate("/dashboard/activities?action=new")}
          >
            <Plus className="w-3.5 h-3.5" />
            {t("mp.add_service") || "Add Service"}
          </Button>
          {provider?.slug && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 justify-start"
              onClick={() => window.open(`/showcase/${provider.slug}`, "_blank")}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t("mp.view_storefront") || "View Storefront"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 justify-start"
            onClick={() => navigate("/dashboard/activities?tab=bookings")}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {t("mp.manage_bookings") || "Bookings"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 justify-start"
            onClick={() => navigate("/dashboard/activities?tab=settings")}
          >
            <Settings className="w-3.5 h-3.5" />
            {t("mp.provider_settings") || "Settings"}
          </Button>
        </div>
      </div>

      {/* Live Status */}
      {provider && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: provider.is_live ? "hsl(var(--success, 142 76% 36%))" : "hsl(var(--muted-foreground))" }}
            />
            <span className="text-xs font-medium text-foreground">
              {provider.is_live ? (t("mp.live_now") || "Live Now") : (t("mp.offline") || "Offline")}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {provider.reviews_count || 0} {t("mp.reviews") || "reviews"} • {provider.completed_jobs || 0} {t("mp.jobs") || "jobs"}
          </span>
        </div>
      )}
    </div>
  );
}
