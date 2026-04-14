import { useState, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n, tSafe } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { realEstatePropertyService, realEstateAnalyticsService } from "@/services/real-estate.service";
import type { Property, PortfolioAnalytics } from "@/domains/real-estate/canonical-types";
import { Building2, TrendingUp, AlertTriangle, Eye, ChevronRight, Home, Wrench, Key } from "lucide-react";

const navy = "hsl(226 24% 14%)";
const gold = "hsl(var(--accent))";

const PropertyDashboardWidget = memo(function PropertyDashboardWidget() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    Promise.all([
      realEstatePropertyService.fetchByUser(user.id).catch(() => []),
      realEstateAnalyticsService.getPortfolioOverview(user.id).catch(() => null),
    ]).then(([props, stats]) => {
      setProperties(props);
      setAnalytics(stats);
      setIsOwner(props.length > 0);
      setLoading(false);
    });
  }, [user?.id]);

  if (!isOwner && !loading && properties.length === 0) return null;

  if (loading) return (
    <div className="px-4 mb-5">
      <div className="h-4 w-40 rounded skeleton-premium mb-3" />
      <div className="grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl skeleton-premium" />)}
      </div>
    </div>
  );

  if (isOwner && analytics) {
    return (
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[13px] font-bold" style={{ color: navy }}>
            {tSafe(t, "re.me.cockpit", "Property Management")}
          </h2>
          <button
            onClick={() => navigate("/me/properties")}
            className="text-[11px] font-semibold flex items-center gap-1"
            style={{ color: gold }}
          >
            {tSafe(t, "common.see_all", "See all")} <ChevronRight size={12} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: tSafe(t, "re.me.properties", "Properties"), value: analytics.totalProperties, icon: <Home size={14} />, color: gold },
            { label: tSafe(t, "re.me.occupancy", "Occupancy"), value: `${analytics.occupancyRate}%`, icon: <Key size={14} />, color: "#22c55e" },
            { label: tSafe(t, "re.analytics.open_tickets", "Tickets"), value: analytics.openTickets, icon: <Wrench size={14} />, color: analytics.openTickets > 0 ? "#ef4444" : "#999" },
            { label: tSafe(t, "re.analytics.active_leases", "Leases"), value: analytics.activeLeases, icon: <TrendingUp size={14} />, color: "#3b82f6" },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl p-2.5 text-center" style={{ background: "white", border: "1px solid #f0f0f0" }}>
              <div className="flex justify-center mb-1" style={{ color: kpi.color }}>{kpi.icon}</div>
              <div className="text-sm font-bold break-words" style={{ color: navy }}>{kpi.value}</div>
              <div className="text-[10px]" style={{ color: "#999" }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {properties.slice(0, 2).map(p => (
          <button
            key={p.id}
            onClick={() => navigate(`/me/properties/list`)}
            className="w-full flex items-center gap-3 p-3 mb-1.5 rounded-xl text-left transition-transform active:scale-[0.98]"
            style={{ background: "white", border: "1px solid #f0f0f0" }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${gold}15` }}>
              <Building2 size={16} style={{ color: gold }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold line-clamp-1 break-words" style={{ color: navy }}>{p.title}</div>
              <div className="text-[10px]" style={{ color: "#999" }}>{p.address.city}, {p.address.country}</div>
            </div>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: p.status === "published" ? "#dcfce7" : p.status === "rented" ? "#dbeafe" : "#f3f4f6",
                color: p.status === "published" ? "#16a34a" : p.status === "rented" ? "#2563eb" : "#6b7280",
              }}
            >
              {tSafe(t, `re.status.${p.status}`, p.status)}
            </span>
          </button>
        ))}

        {analytics.openTickets > 0 && (
          <button
            onClick={() => navigate("/me/maintenance")}
            className="w-full flex items-center gap-2 p-2.5 rounded-xl mt-1"
            style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
          >
            <AlertTriangle size={14} color="#ef4444" />
            <span className="text-xs font-medium" style={{ color: "#dc2626" }}>
              {analytics.openTickets} {tSafe(t, "re.ticket.open", "open")} {tSafe(t, "re.me.maintenance", "maintenance").toLowerCase()}
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[13px] font-bold" style={{ color: navy }}>
          {tSafe(t, "re.marketplace", "Real Estate")}
        </h2>
        <button
          onClick={() => navigate("/real-estate")}
          className="text-[11px] font-semibold flex items-center gap-1"
          style={{ color: gold }}
        >
          {tSafe(t, "property.explore_project", "Explore")} <ChevronRight size={12} />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {[
          { label: tSafe(t, "re.listing.sale", "Buy"), icon: "🏠", route: "/real-estate?tab=sale" },
          { label: tSafe(t, "re.listing.rent", "Rent"), icon: "🔑", route: "/real-estate?tab=rent" },
          { label: tSafe(t, "re.listing.short_stay", "Short Stay"), icon: "🏖️", route: "/real-estate?tab=short_stay" },
        ].map((item, i) => (
          <button
            key={i}
            onClick={() => navigate(item.route)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-transform active:scale-95"
            style={{ background: "white", border: "1px solid #f0f0f0" }}
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-xs font-semibold" style={{ color: navy }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

export default PropertyDashboardWidget;
