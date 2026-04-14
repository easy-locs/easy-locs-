import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { realEstateMaintenanceService } from "@/services/real-estate.service";
import type { MaintenanceTicket, TicketStatus, TicketPriority } from "@/domains/real-estate/canonical-types";
import { ArrowLeft, Wrench, Plus, AlertTriangle, Clock, CheckCircle, ChevronRight } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

const navy = "hsl(220 40% 18%)";
const gold = "hsl(38 65% 56%)";

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  urgent: "#ef4444",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <AlertTriangle size={14} />,
  assigned: <Clock size={14} />,
  in_progress: <Wrench size={14} />,
  pending_approval: <Clock size={14} />,
  resolved: <CheckCircle size={14} />,
  closed: <CheckCircle size={14} />,
};

export default function MeMaintenancePage() {
  useUiEngine("me-memaintenancepage");
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");

  useEffect(() => {
    if (!user?.id) return;
    realEstateMaintenanceService.fetchByUser(user.id)
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = statusFilter === "all" ? tickets : tickets.filter(t => t.status === statusFilter);

  return (
    <div className="min-h-screen pb-24" style={{ background: "#f8f9fa" }}>
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ background: navy }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/me/properties")} className="p-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <ArrowLeft size={20} color="#fff" />
          </button>
          <h1 className="text-base font-bold text-white flex-1">{t("re.me.maintenance", "Maintenance")}</h1>
          <button className="p-2 rounded-xl" style={{ background: gold }}>
            <Plus size={16} style={{ color: navy }} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {(["all", "open", "assigned", "in_progress", "resolved", "closed"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap capitalize"
              style={{
                background: statusFilter === s ? gold : "rgba(255,255,255,0.1)",
                color: statusFilter === s ? navy : "rgba(255,255,255,0.6)",
              }}
            >
              {s === "all" ? t("common.all", "All") : t(`re.ticket.${s}`, s.replace(/_/g, " "))}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "#e8e8e8" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Wrench size={48} className="mx-auto mb-3" style={{ color: "#ccc" }} />
            <p className="text-sm font-medium" style={{ color: navy }}>{t("re.me.no_tickets", "No maintenance tickets")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => navigate(`/me/maintenance/${ticket.id}`)}
                className="w-full text-left p-4 rounded-xl"
                style={{ background: "#fff" }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg mt-0.5" style={{ background: `${PRIORITY_COLORS[ticket.priority]}15` }}>
                    <span style={{ color: PRIORITY_COLORS[ticket.priority] }}>
                      {STATUS_ICONS[ticket.status] ?? <Wrench size={14} />}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium line-clamp-1 break-words" style={{ color: navy }}>{ticket.category}</span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                        style={{ background: `${PRIORITY_COLORS[ticket.priority]}15`, color: PRIORITY_COLORS[ticket.priority] }}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-xs line-clamp-2" style={{ color: "#666" }}>{ticket.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] capitalize" style={{ color: "#999" }}>
                        {t(`re.ticket.${ticket.status}`, ticket.status.replace(/_/g, " "))}
                      </span>
                      <span className="text-[10px]" style={{ color: "#ccc" }}>·</span>
                      <span className="text-[10px]" style={{ color: "#999" }}>
                        {new Date(ticket.openedAt).toLocaleDateString()}
                      </span>
                      {ticket.finalCost !== undefined && (
                        <>
                          <span className="text-[10px]" style={{ color: "#ccc" }}>·</span>
                          <span className="text-[10px] font-medium" style={{ color: gold }}>
                            {ticket.finalCost.toLocaleString()} {ticket.currency}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: "#ccc" }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
