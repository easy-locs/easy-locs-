import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { realEstatePropertyService, realEstateAnalyticsService } from "@/services/real-estate.service";
import type { Property, PortfolioAnalytics } from "@/domains/real-estate/canonical-types";
import { useUiEngine } from "@/hooks/useUiEngine";
import {
  ArrowLeft, Plus, Building2, Users, Wrench,
  BarChart3, Settings, ChevronRight, TrendingUp, AlertTriangle,
  Wallet, Home, Key,
} from "lucide-react";
import SubPageShell from "@/components/layout/SubPageShell";

const navy = "hsl(226 24% 14%)";
const gold = "hsl(var(--accent))";

export default function MePropertyCockpit() {
  useUiEngine("me-mepropertycockpit");
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      realEstatePropertyService.fetchByUser(user.id),
      realEstateAnalyticsService.getPortfolioOverview(user.id),
    ])
      .then(([props, stats]) => {
        setProperties(props);
        setAnalytics(stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const sections = [
    {
      title: t("re.me.portfolio", "Property Portfolio"),
      icon: <Building2 size={18} />,
      path: "/me/properties/list",
      count: analytics?.totalProperties ?? 0,
      color: gold,
    },
    {
      title: t("re.me.tenants", "Tenants"),
      icon: <Users size={18} />,
      path: "/me/tenants",
      count: analytics?.activeLeases ?? 0,
      color: "#22c55e",
    },
    {
      title: t("re.me.leases", "Leases"),
      icon: <Key size={18} />,
      path: "/me/leases",
      count: analytics?.activeLeases ?? 0,
      color: "#3b82f6",
    },
    {
      title: t("re.me.maintenance", "Maintenance"),
      icon: <Wrench size={18} />,
      path: "/me/maintenance",
      count: analytics?.openTickets ?? 0,
      color: analytics?.openTickets && analytics.openTickets > 0 ? "#ef4444" : "#999",
    },
    {
      title: t("re.me.analytics", "Analytics"),
      icon: <BarChart3 size={18} />,
      path: "/me/properties/analytics",
      color: "#06b6d4",
    },
  ];

  return (
    <SubPageShell className="bg-background">
      <div className="px-4 pt-4 pb-5" style={{ background: navy }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/me")} className="p-1.5 rounded-full bg-white/10">
            <ArrowLeft size={20} color="#fff" />
          </button>
          <h1 className="text-lg font-bold text-white flex-1">{t("re.me.cockpit", "Property Management")}</h1>
          <button
            onClick={() => navigate("/me/properties/create")}
            className="p-2 rounded-xl"
            style={{ background: gold }}
          >
            <Plus size={18} style={{ color: navy }} />
          </button>
        </div>

        {!loading && analytics && (
          <div className="grid grid-cols-3 gap-2">
            <StatChip label={t("re.me.properties", "Properties")} value={analytics.totalProperties} icon={<Home size={14} />} />
            <StatChip label={t("re.me.occupancy", "Occupancy")} value={`${analytics.occupancyRate}%`} icon={<TrendingUp size={14} />} />
            <StatChip label={t("re.me.vacant", "Vacant")} value={analytics.vacantUnits} icon={<AlertTriangle size={14} />} urgent={analytics.vacantUnits > 0} />
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl animate-pulse bg-white/10" />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 -mt-2">
        <button
          onClick={() => navigate("/wallet/property")}
          className="w-full flex items-center gap-3 p-4 rounded-xl mb-4 shadow-sm bg-card"
        >
          <div className="p-2 rounded-lg" style={{ background: `${gold}20` }}>
            <Wallet size={20} style={{ color: gold }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold" style={{ color: navy }}>{t("re.me.finance_summary", "Property Finance")}</p>
            <p className="text-xs" style={{ color: "#999" }}>
              {analytics ? `${analytics.monthlyRevenue.toLocaleString()} ${analytics.currency}/mo` : "—"}
            </p>
          </div>
          <ChevronRight size={16} style={{ color: "#ccc" }} />
        </button>
      </div>

      <div className="px-4 space-y-2">
        {sections.map(section => (
          <button
            key={section.path}
            onClick={() => navigate(section.path)}
            className="w-full flex items-center gap-3 p-4 rounded-xl shadow-sm bg-card"
          >
            <div className="p-2 rounded-lg" style={{ background: `${section.color}15` }}>
              <span style={{ color: section.color }}>{section.icon}</span>
            </div>
            <span className="flex-1 text-left text-sm font-medium" style={{ color: navy }}>
              {section.title}
            </span>
            {section.count !== undefined && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#f0f0f0", color: navy }}>
                {section.count}
              </span>
            )}
            <ChevronRight size={16} style={{ color: "#ccc" }} />
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        <p className="text-xs font-semibold mb-2 px-1" style={{ color: "#999" }}>
          {t("re.me.recent_properties", "Recent Properties")}
        </p>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#e8e8e8" }} />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-8 rounded-xl bg-card">
            <Building2 size={32} className="mx-auto mb-2" style={{ color: "#ccc" }} />
            <p className="text-sm" style={{ color: "#999" }}>{t("re.me.no_properties", "No properties yet")}</p>
            <button
              onClick={() => navigate("/me/properties/create")}
              className="mt-2 text-xs font-medium"
              style={{ color: gold }}
            >
              + {t("re.me.add_property", "Add your first property")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {properties.slice(0, 5).map(prop => (
              <button
                key={prop.id}
                onClick={() => navigate(`/me/properties/${prop.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "#e8e8e8" }}>
                  <div className="w-full h-full flex items-center justify-center">
                    <Home size={18} style={{ color: "#bbb" }} />
                  </div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium line-clamp-1 break-words" style={{ color: navy }}>{prop.title}</p>
                  <p className="text-xs truncate" style={{ color: "#999" }}>{prop.address.city}, {prop.address.country}</p>
                </div>
                <span
                  className="text-[0.625rem] font-medium px-2 py-0.5 rounded-full capitalize"
                  style={{
                    background: prop.status === "published" ? "#22c55e20" : "#f5920020",
                    color: prop.status === "published" ? "#22c55e" : "#f59200",
                  }}
                >
                  {prop.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </SubPageShell>
  );
}

function StatChip({ label, value, icon, urgent }: { label: string; value: string | number; icon: React.ReactNode; urgent?: boolean }) {
  return (
    <div className="rounded-xl p-3 text-center bg-white/[0.08]">
      <div className="flex items-center justify-center gap-1 mb-1" style={{ color: urgent ? "#ef4444" : "rgba(255,255,255,0.5)" }}>
        {icon}
      </div>
      <p className="text-lg font-bold" style={{ color: urgent ? "#ef4444" : "#fff" }}>{value}</p>
      <p className="text-[0.625rem]" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</p>
    </div>
  );
}
