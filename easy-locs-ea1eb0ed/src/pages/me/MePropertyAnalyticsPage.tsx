import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { realEstateAnalyticsService } from "@/services/real-estate.service";
import type { PortfolioAnalytics } from "@/domains/real-estate/canonical-types";
import {
import { useUiEngine } from "@/hooks/useUiEngine";
  ArrowLeft, BarChart3, TrendingUp, Home, Users,
  Wrench, DollarSign, Target, AlertTriangle,
} from "lucide-react";

const navy = "hsl(225 22% 16%)";
const gold = "hsl(var(--accent))";

export default function MePropertyAnalyticsPage() {
  useUiEngine("me-mepropertyanalyticspage");
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    realEstateAnalyticsService.getPortfolioOverview(user.id)
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "#f8f9fa" }}>
        <div className="h-16 animate-pulse" style={{ background: navy }} />
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "#e8e8e8" }} />
          ))}
        </div>
      </div>
    );
  }

  const stats = analytics ?? {
    totalProperties: 0, totalUnits: 0, activeLeases: 0, vacantUnits: 0,
    openTickets: 0, occupancyRate: 0, rentCollectionRate: 0, monthlyRevenue: 0,
    currency: "USD" as const, qualityScore: 0,
  };

  const metrics = [
    { label: t("re.analytics.total_properties", "Total Properties"), value: stats.totalProperties, icon: <Home size={18} />, color: gold },
    { label: t("re.analytics.active_leases", "Active Leases"), value: stats.activeLeases, icon: <Users size={18} />, color: "#22c55e" },
    { label: t("re.analytics.vacant", "Vacant Units"), value: stats.vacantUnits, icon: <AlertTriangle size={18} />, color: stats.vacantUnits > 0 ? "#ef4444" : "#22c55e" },
    { label: t("re.analytics.occupancy", "Occupancy Rate"), value: `${stats.occupancyRate}%`, icon: <Target size={18} />, color: "#3b82f6" },
    { label: t("re.analytics.monthly_revenue", "Monthly Revenue"), value: `${stats.monthlyRevenue.toLocaleString()} ${stats.currency}`, icon: <DollarSign size={18} />, color: gold },
    { label: t("re.analytics.open_tickets", "Open Tickets"), value: stats.openTickets, icon: <Wrench size={18} />, color: stats.openTickets > 0 ? "#f59e0b" : "#22c55e" },
    { label: t("re.analytics.collection_rate", "Rent Collection"), value: `${stats.rentCollectionRate}%`, icon: <TrendingUp size={18} />, color: "#8b5cf6" },
    { label: t("re.analytics.quality_score", "Quality Score"), value: stats.qualityScore || "—", icon: <BarChart3 size={18} />, color: "#06b6d4" },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: "#f8f9fa" }}>
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ background: navy }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/me/properties")} className="p-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <ArrowLeft size={20} color="#fff" />
          </button>
          <h1 className="text-base font-bold text-white">{t("re.me.analytics", "Property Analytics")}</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: "#fff" }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: m.color }}>{m.icon}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: navy }}>{m.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "#999" }}>{m.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 rounded-xl" style={{ background: "#fff" }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: navy }}>
            {t("re.analytics.financial_summary", "Financial Summary")}
          </h3>
          <p className="text-xs" style={{ color: "#999" }}>
            {t("re.analytics.detailed_finance", "For detailed financial operations, visit")}
          </p>
          <button
            onClick={() => navigate("/wallet/property")}
            className="mt-2 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: gold, color: navy }}
          >
            {t("re.analytics.open_wallet", "Open Property Finance")} →
          </button>
        </div>
      </div>
    </div>
  );
}
