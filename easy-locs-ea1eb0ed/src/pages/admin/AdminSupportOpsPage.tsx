import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminOpsService } from "@/services/admin-ops.service";
import { getTicketTypeLabel } from "@/lib/support/ticketTypes";
import { updateTicketAdminState } from "@/lib/support/supportThread";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import SupportThread from "@/components/support/SupportThread";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function AdminSupportOpsPage() {
  useUiEngine("admin-adminsupportopspage");
  const navigate = useNavigate();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-support-ops"],
    queryFn: () => adminOpsService.fetchAllSupportTickets(),
    staleTime: 10_000,
  });

  const counts = useMemo(() => ({
    open: tickets.filter((t: any) => t.status === "open").length,
    pending: tickets.filter((t: any) => t.status === "pending" || t.status === "in_progress").length,
    resolved: tickets.filter((t: any) => t.status === "resolved").length,
  }), [tickets]);

  const setStatus = async (ticketId: string, status: string) => {
    try {
      await updateTicketAdminState({ ticketId, status });
      toast.success(`Ticket marked ${status}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket");
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate("/admin/marketplace-ops")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Support Operations</h1>
          <p className="text-xs text-muted-foreground">Admin ticket monitoring</p>
        </div>
      </header>

      <div className="px-4 pb-24 space-y-4">
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { title: "Open", value: counts.open },
            { title: "Pending", value: counts.pending },
            { title: "Resolved", value: counts.resolved },
          ].map((m) => (
            <div key={m.title} className="rounded-2xl border border-border/20 bg-card p-3 text-center">
              <p className="text-[11px] text-muted-foreground font-semibold">{m.title}</p>
              <p className="text-xl font-bold text-foreground">{m.value}</p>
            </div>
          ))}
        </div>

        {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}

        {!isLoading && tickets.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">No support tickets yet</div>
        )}

        {!isLoading && tickets.map((ticket: any) => (
          <div key={ticket.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
            <button onClick={() => setSelectedTicketId(selectedTicketId === ticket.id ? null : ticket.id)} className="w-full text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground truncate">{ticket.subject || "Support request"}</p>
                  <p className="text-[11px] text-muted-foreground">{getTicketTypeLabel(ticket.ticket_type)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  style={{
                    color: ticket.status === "resolved" ? "hsl(142 70% 45%)" : ticket.status === "pending" || ticket.status === "in_progress" ? "hsl(45 90% 55%)" : "hsl(200 80% 55%)",
                    background: ticket.status === "resolved" ? "hsl(142 70% 45% / 0.12)" : ticket.status === "pending" || ticket.status === "in_progress" ? "hsl(45 90% 55% / 0.12)" : "hsl(200 80% 55% / 0.12)",
                  }}
                >
                  {ticket.status || "open"}
                </span>
              </div>
            </button>

            <div className="flex gap-2">
              <button onClick={() => setStatus(ticket.id, "open")} className="flex-1 rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-foreground">Open</button>
              <button onClick={() => setStatus(ticket.id, "in_progress")} className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "hsl(45 90% 55% / 0.12)", color: "hsl(45 90% 55%)" }}>Pending</button>
              <button onClick={() => setStatus(ticket.id, "resolved")} className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "hsl(142 70% 45% / 0.12)", color: "hsl(142 70% 45%)" }}>Resolve</button>
            </div>

            {selectedTicketId === ticket.id && (
              <SupportThread ticketId={ticket.id} actorRole="admin" showInternal />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
