import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { realEstatePropertyService } from "@/services/real-estate.service";
import type { Property, PropertyStatus } from "@/domains/real-estate/canonical-types";
import { ArrowLeft, Plus, Search, Home, MapPin, Filter } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const navy = "hsl(226 24% 14%)";
const gold = "hsl(var(--accent))";

const STATUS_COLORS: Record<string, string> = {
  published: "#22c55e",
  draft: "#f59e0b",
  paused: "#6b7280",
  archived: "#9ca3af",
  sold: "#3b82f6",
  rented: "#8b5cf6",
};

export default function MePropertyListPage() {
  useUiEngine("me-properties");
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all");

  useEffect(() => {
    if (!user?.id) return;
    realEstatePropertyService.fetchByUser(user.id)
      .then(setProperties)
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = properties.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.address.city.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const statuses: (PropertyStatus | "all")[] = ["all", "published", "draft", "paused", "rented", "archived"];

  return (
    <SubPageShell className="bg-background">
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ background: navy }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/me/properties")} className="p-1.5 rounded-full bg-white/10">
            <ArrowLeft size={20} color="#fff" />
          </button>
          <h1 className="text-base font-bold text-white flex-1">{t("re.me.portfolio", "Property Portfolio")}</h1>
          <button onClick={() => navigate("/me/properties/create")} className="p-2 rounded-xl" style={{ background: gold }}>
            <Plus size={16} style={{ color: navy }} />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/10">
          <Search size={16} color="rgba(255,255,255,0.4)" />
          <input
            type="text"
            placeholder={t("re.search_properties", "Search properties...")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent text-white text-sm flex-1 outline-none placeholder:text-white/40"
            style={{ fontSize: "1rem" }}
          />
        </div>
      </div>

      <div className="px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize"
            style={{
              background: statusFilter === s ? navy : "#fff",
              color: statusFilter === s ? "#fff" : "#666",
            }}
          >
            {s === "all" ? t("common.all", "All") : t(`re.status.${s}`, s)}
            {s !== "all" && ` (${properties.filter(p => p.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="px-4 py-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "#e8e8e8" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Home size={48} className="mx-auto mb-3" style={{ color: "#ccc" }} />
            <p className="text-sm font-medium" style={{ color: navy }}>{t("re.me.no_properties", "No properties yet")}</p>
            <button
              onClick={() => navigate("/me/properties/create")}
              className="mt-3 px-6 py-2 rounded-xl text-sm font-medium"
              style={{ background: gold, color: navy }}
            >
              + {t("re.me.add_property", "Add property")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(prop => (
              <button
                key={prop.id}
                onClick={() => navigate(`/me/properties/${prop.id}`)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl shadow-sm bg-card"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "#f0f0f0" }}>
                  <Home size={20} style={{ color: "#bbb" }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold line-clamp-1 break-words" style={{ color: navy }}>{prop.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} style={{ color: "#999" }} />
                    <p className="text-xs truncate" style={{ color: "#999" }}>
                      {[prop.address.city, prop.address.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold" style={{ color: gold }}>
                      {prop.price.toLocaleString()} {prop.currency}
                    </span>
                    <span className="text-[0.625rem] capitalize" style={{ color: "#999" }}>
                      {prop.listingType.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                <span
                  className="text-[0.625rem] font-bold px-2 py-0.5 rounded-full capitalize"
                  style={{
                    background: `${STATUS_COLORS[prop.status] ?? "#999"}15`,
                    color: STATUS_COLORS[prop.status] ?? "#999",
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
