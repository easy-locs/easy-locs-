import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { realEstateLeaseService } from "@/services/real-estate.service";
import type { Lease, LeaseStatus } from "@/domains/real-estate/canonical-types";
import { ArrowLeft, Key, Plus, Calendar, DollarSign, ChevronRight } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

const navy = "hsl(225 22% 16%)";
const gold = "hsl(var(--accent))";

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  draft: "#f59e0b",
  pending_signature: "#3b82f6",
  late: "#ef4444",
  terminated: "#9ca3af",
  expired: "#6b7280",
  completed: "#8b5cf6",
};

export default function MeLeasesPage() {
  useUiEngine("me-leases");
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | "all">("all");

  useEffect(() => {
    if (!user?.id) return;
    realEstateLeaseService.fetchActive(user.id)
      .then(setLeases)
      .catch(() => setLeases([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = statusFilter === "all" ? leases : leases.filter(l => l.status === statusFilter);

  return (
    <div className="min-h-screen pb-24" style={{ background: "#f8f9fa" }}>
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ background: navy }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/me/properties")} className="p-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <ArrowLeft size={20} color="#fff" />
          </button>
          <h1 className="text-base font-bold text-white flex-1">{t("re.me.leases", "Leases")}</h1>
          <button className="p-2 rounded-xl" style={{ background: gold }}>
            <Plus size={16} style={{ color: navy }} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {(["all", "active", "draft", "pending_signature", "late", "expired"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap capitalize"
              style={{
                background: statusFilter === s ? gold : "rgba(255,255,255,0.1)",
                color: statusFilter === s ? navy : "rgba(255,255,255,0.6)",
              }}
            >
              {s === "all" ? t("common.all", "All") : t(`re.lease.${s}`, s.replace(/_/g, " "))}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "#e8e8e8" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Key size={48} className="mx-auto mb-3" style={{ color: "#ccc" }} />
            <p className="text-sm font-medium" style={{ color: navy }}>{t("re.me.no_leases", "No leases found")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(lease => (
              <button
                key={lease.id}
                onClick={() => navigate(`/me/leases/${lease.id}`)}
                className="w-full text-left p-4 rounded-xl"
                style={{ background: "#fff" }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                    style={{
                      background: `${STATUS_COLORS[lease.status] ?? "#999"}15`,
                      color: STATUS_COLORS[lease.status] ?? "#999",
                    }}
                  >
                    {t(`re.lease.${lease.status}`, lease.status.replace(/_/g, " "))}
                  </span>
                  <span className="text-xs" style={{ color: "#999" }}>
                    {lease.paymentCycle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} style={{ color: gold }} />
                    <span className="text-sm font-bold" style={{ color: navy }}>
                      {lease.rentAmount.toLocaleString()} {lease.currency}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={12} style={{ color: "#999" }} />
                    <span className="text-xs" style={{ color: "#999" }}>
                      {new Date(lease.startDate).toLocaleDateString()} — {new Date(lease.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
